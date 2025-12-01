import {
  UserRole,
  UserRoleVO,
  Permission,
  ROLE_PERMISSIONS,
} from '@modules/users/domain/value-objects/user-role.vo';

describe('UserRole Value Object', () => {
  describe('UserRole enum', () => {
    it('should have all required roles', () => {
      expect(UserRole.ADMIN).toBe('ADMIN');
      expect(UserRole.ORGANIZER).toBe('ORGANIZER');
      expect(UserRole.PARTICIPANT).toBe('PARTICIPANT');
    });

    it('should have exactly 3 roles', () => {
      expect(Object.keys(UserRole)).toHaveLength(3);
    });
  });

  describe('create', () => {
    it('should create from valid string', () => {
      const role = UserRoleVO.create('ADMIN');
      expect(role.value).toBe(UserRole.ADMIN);
    });

    it('should create from all valid role strings', () => {
      expect(UserRoleVO.create('ADMIN').value).toBe(UserRole.ADMIN);
      expect(UserRoleVO.create('ORGANIZER').value).toBe(UserRole.ORGANIZER);
      expect(UserRoleVO.create('PARTICIPANT').value).toBe(UserRole.PARTICIPANT);
    });

    it('should throw for invalid role string', () => {
      expect(() => UserRoleVO.create('INVALID')).toThrow();
      expect(() => UserRoleVO.create('')).toThrow();
      expect(() => UserRoleVO.create('admin')).toThrow(); // case sensitive
    });
  });

  describe('fromEnum', () => {
    it('should create from enum value', () => {
      const role = UserRoleVO.fromEnum(UserRole.ORGANIZER);
      expect(role.value).toBe(UserRole.ORGANIZER);
    });
  });

  describe('role checks', () => {
    it('should correctly identify admin', () => {
      const admin = UserRoleVO.create('ADMIN');
      expect(admin.isAdmin()).toBe(true);
      expect(admin.isOrganizer()).toBe(false);
      expect(admin.isParticipant()).toBe(false);
    });

    it('should correctly identify organizer', () => {
      const organizer = UserRoleVO.create('ORGANIZER');
      expect(organizer.isAdmin()).toBe(false);
      expect(organizer.isOrganizer()).toBe(true);
      expect(organizer.isParticipant()).toBe(false);
    });

    it('should correctly identify participant', () => {
      const participant = UserRoleVO.create('PARTICIPANT');
      expect(participant.isAdmin()).toBe(false);
      expect(participant.isOrganizer()).toBe(false);
      expect(participant.isParticipant()).toBe(true);
    });
  });

  describe('permissions', () => {
    describe('ADMIN role', () => {
      const admin = UserRoleVO.create('ADMIN');

      it('should have all permissions', () => {
        const permissions = admin.getPermissions();
        expect(permissions).toContain(Permission.USER_MANAGE_ROLES);
        expect(permissions).toContain(Permission.PLATFORM_SETTINGS);
        expect(permissions).toContain(Permission.EVENT_CREATE);
        expect(permissions).toContain(Permission.TICKET_PURCHASE);
      });

      it('should have permission to manage roles', () => {
        expect(admin.hasPermission(Permission.USER_MANAGE_ROLES)).toBe(true);
      });

      it('should have platform settings permission', () => {
        expect(admin.hasPermission(Permission.PLATFORM_SETTINGS)).toBe(true);
      });
    });

    describe('ORGANIZER role', () => {
      const organizer = UserRoleVO.create('ORGANIZER');

      it('should have event management permissions', () => {
        expect(organizer.hasPermission(Permission.EVENT_CREATE)).toBe(true);
        expect(organizer.hasPermission(Permission.EVENT_UPDATE)).toBe(true);
        expect(organizer.hasPermission(Permission.EVENT_DELETE)).toBe(true);
        expect(organizer.hasPermission(Permission.EVENT_PUBLISH)).toBe(true);
      });

      it('should have ticket validation permission', () => {
        expect(organizer.hasPermission(Permission.TICKET_VALIDATE)).toBe(true);
      });

      it('should NOT have admin-only permissions', () => {
        expect(organizer.hasPermission(Permission.USER_MANAGE_ROLES)).toBe(false);
        expect(organizer.hasPermission(Permission.PLATFORM_SETTINGS)).toBe(false);
      });

      it('should NOT have ticket purchase permission', () => {
        expect(organizer.hasPermission(Permission.TICKET_PURCHASE)).toBe(false);
      });
    });

    describe('PARTICIPANT role', () => {
      const participant = UserRoleVO.create('PARTICIPANT');

      it('should have ticket purchase permission', () => {
        expect(participant.hasPermission(Permission.TICKET_PURCHASE)).toBe(true);
      });

      it('should have event read permission', () => {
        expect(participant.hasPermission(Permission.EVENT_READ)).toBe(true);
      });

      it('should NOT have event creation permissions', () => {
        expect(participant.hasPermission(Permission.EVENT_CREATE)).toBe(false);
        expect(participant.hasPermission(Permission.EVENT_UPDATE)).toBe(false);
        expect(participant.hasPermission(Permission.EVENT_DELETE)).toBe(false);
      });

      it('should have user read and update for own profile', () => {
        expect(participant.hasPermission(Permission.USER_READ)).toBe(true);
        expect(participant.hasPermission(Permission.USER_UPDATE)).toBe(true);
      });

      it('should NOT have user management permissions', () => {
        expect(participant.hasPermission(Permission.USER_DELETE)).toBe(false);
        expect(participant.hasPermission(Permission.USER_MANAGE_ROLES)).toBe(false);
      });
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when role has all specified permissions', () => {
      const admin = UserRoleVO.create('ADMIN');
      expect(
        admin.hasAllPermissions([Permission.USER_READ, Permission.USER_DELETE]),
      ).toBe(true);
    });

    it('should return false when role is missing one permission', () => {
      const participant = UserRoleVO.create('PARTICIPANT');
      expect(
        participant.hasAllPermissions([Permission.EVENT_READ, Permission.EVENT_CREATE]),
      ).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when role has at least one permission', () => {
      const participant = UserRoleVO.create('PARTICIPANT');
      expect(
        participant.hasAnyPermission([Permission.EVENT_CREATE, Permission.EVENT_READ]),
      ).toBe(true);
    });

    it('should return false when role has none of the permissions', () => {
      const participant = UserRoleVO.create('PARTICIPANT');
      expect(
        participant.hasAnyPermission([Permission.PLATFORM_SETTINGS, Permission.USER_DELETE]),
      ).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for same role', () => {
      const role1 = UserRoleVO.create('ADMIN');
      const role2 = UserRoleVO.create('ADMIN');
      expect(role1.equals(role2)).toBe(true);
    });

    it('should return false for different roles', () => {
      const role1 = UserRoleVO.create('ADMIN');
      const role2 = UserRoleVO.create('PARTICIPANT');
      expect(role1.equals(role2)).toBe(false);
    });
  });

  describe('getDisplayName', () => {
    it('should return human-readable names', () => {
      expect(UserRoleVO.create('ADMIN').getDisplayName()).toBe('Administrator');
      expect(UserRoleVO.create('ORGANIZER').getDisplayName()).toBe('Event Organizer');
      expect(UserRoleVO.create('PARTICIPANT').getDisplayName()).toBe('Participant');
    });
  });

  describe('toString', () => {
    it('should return the role value', () => {
      expect(UserRoleVO.create('ADMIN').toString()).toBe('ADMIN');
    });
  });

  describe('static methods', () => {
    it('getAllRoles should return all roles', () => {
      const roles = UserRoleVO.getAllRoles();
      expect(roles).toContain(UserRole.ADMIN);
      expect(roles).toContain(UserRole.ORGANIZER);
      expect(roles).toContain(UserRole.PARTICIPANT);
      expect(roles).toHaveLength(3);
    });

    it('getDefaultRole should return PARTICIPANT', () => {
      expect(UserRoleVO.getDefaultRole()).toBe(UserRole.PARTICIPANT);
    });
  });

  describe('ROLE_PERMISSIONS mapping', () => {
    it('should have permissions for all roles', () => {
      expect(ROLE_PERMISSIONS[UserRole.ADMIN]).toBeDefined();
      expect(ROLE_PERMISSIONS[UserRole.ORGANIZER]).toBeDefined();
      expect(ROLE_PERMISSIONS[UserRole.PARTICIPANT]).toBeDefined();
    });

    it('ADMIN should have more permissions than ORGANIZER', () => {
      expect(ROLE_PERMISSIONS[UserRole.ADMIN].length).toBeGreaterThan(
        ROLE_PERMISSIONS[UserRole.ORGANIZER].length,
      );
    });

    it('ORGANIZER should have more permissions than PARTICIPANT', () => {
      expect(ROLE_PERMISSIONS[UserRole.ORGANIZER].length).toBeGreaterThan(
        ROLE_PERMISSIONS[UserRole.PARTICIPANT].length,
      );
    });
  });
});
