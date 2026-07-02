import type { FastifyPluginAsync } from 'fastify';
import { User } from '../models/User.js';
import { buildProfileUpdate, profileUpdateSchema } from '../utils/profileUpdate.js';
import { publicUser } from '../utils/publicUser.js';
import { parseBody } from '../utils/schemas.js';

export const profileRoutes: FastifyPluginAsync = async (app) => {
  app.patch('/profile', { preHandler: [app.authenticate] }, async (request, reply) => {
    const input = parseBody(profileUpdateSchema, request.body);
    const { $set, $unset } = buildProfileUpdate(input);
    const update: Record<string, unknown> = {};
    if (Object.keys($set).length) update.$set = $set;
    if (Object.keys($unset).length) update.$unset = $unset;
    const user = await User.findByIdAndUpdate(request.user.sub, update, {
      new: true,
      runValidators: true,
    });
    if (!user) return reply.code(404).send({ message: 'User not found' });
    return { user: publicUser(user) };
  });
};
