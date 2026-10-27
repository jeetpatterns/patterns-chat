export default () => ({
  port: parseInt(process.env.PORT || '3006', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    secret: process.env.JWT_SECRET || 'default-fallback-teamflow-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
});
