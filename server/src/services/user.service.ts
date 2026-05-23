import { prisma } from '@/lib/prisma';
import { NotFoundError } from '@/utils/errors';
import { Role } from '@prisma/client';

export class UserService {
  /**
   * Fetches user profile including department information
   */
  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { department: true },
    });

    if (!user) {
      throw new NotFoundError('User profile not found');
    }

    return user;
  }

  /**
   * Updates internal user profile details (e.g. name, role, department)
   */
  static async updateProfile(
    userId: string,
    data: { fullName?: string; departmentId?: string; role?: Role }
  ) {
    // Verify department exists if departmentId is being updated
    if (data.departmentId) {
      const deptExists = await prisma.department.findUnique({
        where: { id: data.departmentId },
      });
      if (!deptExists) {
        throw new NotFoundError('Target department not found');
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
      include: { department: true },
    });

    return updatedUser;
  }

  /**
   * Registers or updates a device's push notification token linked to a user
   */
  static async registerPushToken(
    userId: string,
    fcmToken: string,
    deviceType: string
  ) {
    // Confirm the user exists first
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      throw new NotFoundError('User profile not found');
    }

    const token = await prisma.pushToken.upsert({
      where: { fcmToken },
      update: {
        userId,
        deviceType,
      },
      create: {
        userId,
        fcmToken,
        deviceType,
      },
    });

    return token;
  }

  /**
   * Fetches all registered users
   */
  static async listUsers() {
    return prisma.user.findMany({
      include: { department: true },
      orderBy: { fullName: 'asc' },
    });
  }
}
