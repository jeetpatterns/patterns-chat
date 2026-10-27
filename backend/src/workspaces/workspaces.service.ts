import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { CreateWorkspaceDto } from './dto/create-workspace.dto.js';
import { MemberRole } from '@prisma/client';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  private generateSlug(name: string): string {
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const randomHex = Math.random().toString(36).substring(2, 6);
    return `${baseSlug || 'workspace'}-${randomHex}`;
  }

  private generateJoinCode(): string {
    return 'TF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  async create(userId: string, dto: CreateWorkspaceDto) {
    const slug = this.generateSlug(dto.name);
    const joinCode = this.generateJoinCode();

    const workspace = await this.prisma.workspace.create({
      data: {
        name: dto.name.trim(),
        slug,
        joinCode,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: MemberRole.OWNER,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                presence: true,
              },
            },
          },
        },
      },
    });

    return {
      message: 'Workspace created successfully',
      workspace,
    };
  }

  async findAllForUser(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            _count: {
              select: { members: true },
            },
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return memberships.map((membership) => {
      const isOwnerOrAdmin =
        membership.role === MemberRole.OWNER ||
        membership.role === MemberRole.ADMIN ||
        membership.workspace.owner?.id === userId;

      return {
        id: membership.workspace.id,
        name: membership.workspace.name,
        slug: membership.workspace.slug,
        joinCode: isOwnerOrAdmin ? membership.workspace.joinCode : null,
        role: membership.role,
        joinedAt: membership.joinedAt,
        membersCount: membership.workspace._count.members,
        owner: membership.workspace.owner,
      };
    });
  }

  async findById(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      include: {
        workspace: {
          include: {
            _count: {
              select: { members: true },
            },
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    const isOwnerOrAdmin =
      member.role === MemberRole.OWNER ||
      member.role === MemberRole.ADMIN ||
      member.workspace.owner?.id === userId;

    return {
      ...member.workspace,
      joinCode: isOwnerOrAdmin ? member.workspace.joinCode : null,
      userRole: member.role,
      membersCount: member.workspace._count.members,
    };
  }

  async joinByCode(userId: string, joinCode: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { joinCode: joinCode.trim().toUpperCase() },
    });

    if (!workspace) {
      throw new NotFoundException('Invalid workspace join code');
    }

    const existingMember = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('You are already a member of this workspace');
    }

    const membership = await this.prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId,
        role: MemberRole.MEMBER,
      },
    });

    // Auto-enroll new member into all public channels of this workspace
    const publicChannels = await this.prisma.channel.findMany({
      where: { workspaceId: workspace.id, isPrivate: false },
      select: { id: true },
    });
    for (const ch of publicChannels) {
      await this.prisma.channelMember.upsert({
        where: { channelId_userId: { channelId: ch.id, userId } },
        create: { channelId: ch.id, userId },
        update: {},
      });
    }

    return {
      message: 'Successfully joined workspace',
      workspace,
      role: membership.role,
    };
  }

  async getMembers(workspaceId: string, userId: string) {
    // Verify membership first
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You do not have access to view members of this workspace');
    }

    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            presence: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });

    return members.map((m) => ({
      id: m.id,
      role: m.role,
      joinedAt: m.joinedAt,
      user: m.user,
    }));
  }

  async addMemberByEmail(
    currentUserId: string,
    workspaceId: string,
    email: string,
    role: MemberRole = MemberRole.MEMBER,
  ) {
    if (!email || !email.trim()) {
      throw new ConflictException('Email address is required');
    }

    const cleanEmail = email.toLowerCase().trim();

    // Verify current user belongs to workspace and is OWNER or ADMIN
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const currentMember = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: currentUserId,
        },
      },
    });

    if (!currentMember) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    const roleWeight: Record<MemberRole, number> = {
      [MemberRole.OWNER]: 50,
      [MemberRole.ADMIN]: 40,
      [MemberRole.MANAGER]: 30,
      [MemberRole.TEAM_LEAD]: 20,
      [MemberRole.MEMBER]: 10,
      [MemberRole.GUEST]: 0,
    };

    const isOwner = currentMember.role === MemberRole.OWNER || workspace.ownerId === currentUserId;
    const callerWeight = isOwner ? 50 : (roleWeight[currentMember.role] ?? 0);

    // Minimum role to invite anyone is TEAM_LEAD (weight 20)
    if (callerWeight < 20) {
      throw new ForbiddenException('You do not have permission to invite new members to this workspace');
    }

    const assignedRole = role || MemberRole.MEMBER;
    const targetRoleWeight = roleWeight[assignedRole] ?? 10;

    // Cannot invite someone directly as OWNER
    if (assignedRole === MemberRole.OWNER) {
      throw new ForbiddenException('There can only be one Workspace Owner');
    }

    // A user can only invite/assign a role up to their own role weight
    if (!isOwner && targetRoleWeight > callerWeight) {
      throw new ForbiddenException(`Your role (${currentMember.role}) cannot assign the ${assignedRole} role`);
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        status: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException(`No registered user found with email "${cleanEmail}". They can register and enter the invite code to join.`);
    }

    const existingMember = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: targetUser.id,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException(`${targetUser.name} (${cleanEmail}) is already a member of this workspace.`);
    }

    const membership = await this.prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: targetUser.id,
        role: assignedRole,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            presence: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    // Auto-enroll new member into all public channels of this workspace
    const publicChannels = await this.prisma.channel.findMany({
      where: { workspaceId, isPrivate: false },
      select: { id: true },
    });
    for (const ch of publicChannels) {
      await this.prisma.channelMember.upsert({
        where: { channelId_userId: { channelId: ch.id, userId: targetUser.id } },
        create: { channelId: ch.id, userId: targetUser.id },
        update: {},
      });
    }

    return {
      message: `${targetUser.name} was successfully added as ${assignedRole}`,
      member: {
        id: membership.id,
        role: membership.role,
        joinedAt: membership.joinedAt,
        user: membership.user,
      },
    };
  }

  async updateMemberRole(
    currentUserId: string,
    workspaceId: string,
    memberIdOrUserId: string,
    newRole: MemberRole,
  ) {
    const roleWeight: Record<MemberRole, number> = {
      [MemberRole.OWNER]: 50,
      [MemberRole.ADMIN]: 40,
      [MemberRole.MANAGER]: 30,
      [MemberRole.TEAM_LEAD]: 20,
      [MemberRole.MEMBER]: 10,
      [MemberRole.GUEST]: 0,
    };

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const currentMember = workspace.members.find((m) => m.userId === currentUserId);
    if (!currentMember) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    const isOwner = currentMember.role === MemberRole.OWNER || workspace.ownerId === currentUserId;
    const callerWeight = isOwner ? 50 : (roleWeight[currentMember.role] ?? 0);

    // Minimum role to change roles is MANAGER (weight 30)
    if (callerWeight < 30) {
      throw new ForbiddenException('You do not have permission to manage member roles');
    }

    const targetMember = workspace.members.find(
      (m) => m.id === memberIdOrUserId || m.userId === memberIdOrUserId,
    );

    if (!targetMember) {
      throw new NotFoundException('Member not found in this workspace');
    }

    if (targetMember.userId === currentUserId) {
      throw new ForbiddenException('You cannot modify your own role');
    }

    if (targetMember.role === MemberRole.OWNER || targetMember.userId === workspace.ownerId) {
      throw new ForbiddenException('Cannot modify the Workspace Owner role');
    }

    if (newRole === MemberRole.OWNER) {
      throw new ForbiddenException('Cannot transfer the Workspace Owner role');
    }

    const targetCurrentWeight = roleWeight[targetMember.role] ?? 10;
    const newRoleWeight = roleWeight[newRole] ?? 10;

    // Caller must have higher authority than target's current role (unless OWNER)
    if (!isOwner && callerWeight <= targetCurrentWeight) {
      throw new ForbiddenException(`You cannot modify the role of another ${targetMember.role}`);
    }

    // Caller cannot assign a role higher than their own
    if (!isOwner && newRoleWeight > callerWeight) {
      throw new ForbiddenException(`You cannot assign a role (${newRole}) higher than your own (${currentMember.role})`);
    }

    const updated = await this.prisma.workspaceMember.update({
      where: { id: targetMember.id },
      data: { role: newRole },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            status: true,
            presence: true,
          },
        },
      },
    });

    return {
      message: `${targetMember.user.name}'s role was updated to ${newRole}`,
      member: updated,
    };
  }

  async removeMember(currentUserId: string, workspaceId: string, memberIdOrUserId: string) {
    const roleWeight: Record<MemberRole, number> = {
      [MemberRole.OWNER]: 50,
      [MemberRole.ADMIN]: 40,
      [MemberRole.MANAGER]: 30,
      [MemberRole.TEAM_LEAD]: 20,
      [MemberRole.MEMBER]: 10,
      [MemberRole.GUEST]: 0,
    };

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const currentMember = workspace.members.find((m) => m.userId === currentUserId);
    if (!currentMember) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    const isOwner = currentMember.role === MemberRole.OWNER || workspace.ownerId === currentUserId;
    const callerWeight = isOwner ? 50 : (roleWeight[currentMember.role] ?? 0);

    // Minimum role to remove a member is TEAM_LEAD (weight 20)
    if (callerWeight < 20) {
      throw new ForbiddenException('You do not have permission to remove members from this workspace');
    }

    const targetMember = workspace.members.find(
      (m) => m.id === memberIdOrUserId || m.userId === memberIdOrUserId,
    );

    if (!targetMember) {
      throw new NotFoundException('Member not found in this workspace');
    }

    if (targetMember.role === MemberRole.OWNER || targetMember.userId === workspace.ownerId) {
      throw new ForbiddenException('The Workspace Owner cannot be removed from the workspace');
    }

    if (targetMember.userId === currentUserId) {
      throw new ForbiddenException('You cannot kick yourself from the workspace');
    }

    const targetWeight = roleWeight[targetMember.role] ?? 10;

    // Caller must have higher authority than target member to remove them
    if (!isOwner && callerWeight <= targetWeight) {
      throw new ForbiddenException(`You do not have permission to remove a ${targetMember.role}`);
    }

    await this.prisma.workspaceMember.delete({
      where: { id: targetMember.id },
    });

    return {
      message: `${targetMember.user.name} has been removed from the workspace`,
      removedMemberId: targetMember.id,
      removedUserId: targetMember.userId,
    };
  }
}
