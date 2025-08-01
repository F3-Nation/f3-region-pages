import { sql } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  serial,
  integer,
  varchar,
  json,
  doublePrecision,
  date,
  timestamp,
  boolean,
  foreignKey,
  index,
  uuid,
  real,
  text,
} from 'drizzle-orm/pg-core';

export const achievementCadence = pgEnum('achievement_cadence', [
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
  'lifetime',
]);
export const achievementThresholdType = pgEnum('achievement_threshold_type', [
  'posts',
  'unique_aos',
]);
export const dayOfWeek = pgEnum('day_of_week', [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);
export const eventCadence = pgEnum('event_cadence', ['weekly', 'monthly']);
export const eventCategory = pgEnum('event_category', [
  'first_f',
  'second_f',
  'third_f',
]);
export const orgType = pgEnum('org_type', [
  'ao',
  'region',
  'area',
  'sector',
  'nation',
]);
export const regionRole = pgEnum('region_role', ['user', 'editor', 'admin']);
export const requestType = pgEnum('request_type', [
  'create_location',
  'create_event',
  'edit',
  'delete_event',
]);
export const updateRequestStatus = pgEnum('update_request_status', [
  'pending',
  'approved',
  'rejected',
]);
export const userRole = pgEnum('user_role', ['user', 'editor', 'admin']);
export const userStatus = pgEnum('user_status', ['active', 'inactive']);

export const users = pgTable(
  'users',
  {
    id: serial().notNull(),
    f3Name: varchar('f3_name'),
    firstName: varchar('first_name'),
    lastName: varchar('last_name'),
    email: varchar('email').notNull(),
    phone: varchar(),
    homeRegionId: integer('home_region_id'),
    avatarUrl: varchar('avatar_url'),
    meta: json(),
    created: timestamp({ mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updated: timestamp({ mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    emergencyContact: varchar('emergency_contact'),
    emergencyPhone: varchar('emergency_phone'),
    emergencyNotes: varchar('emergency_notes'),
    emailVerified: timestamp('email_verified', { mode: 'string' }),
    status: userStatus().default('active').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.homeRegionId],
      foreignColumns: [orgs.id],
      name: 'users_home_region_id_fkey',
    }),
  ]
);

export const eventInstances = pgTable(
  'event_instances',
  {
    id: serial().notNull(),
    orgId: integer('org_id').notNull(),
    locationId: integer('location_id'),
    seriesId: integer('series_id'),
    isActive: boolean('is_active').notNull(),
    highlight: boolean().notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    startTime: varchar('start_time'),
    endTime: varchar('end_time'),
    name: varchar().notNull(),
    description: varchar(),
    email: varchar(),
    paxCount: integer('pax_count'),
    fngCount: integer('fng_count'),
    preblast: varchar(),
    backblast: varchar(),
    preblastRich: json('preblast_rich'),
    backblastRich: json('backblast_rich'),
    preblastTs: doublePrecision('preblast_ts'),
    backblastTs: doublePrecision('backblast_ts'),
    meta: json(),
    created: timestamp({ mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updated: timestamp({ mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
  },
  (table) => [
    index('idx_event_instances_is_active').using(
      'btree',
      table.isActive.asc().nullsLast().op('bool_ops')
    ),
    index('idx_event_instances_location_id').using(
      'btree',
      table.locationId.asc().nullsLast().op('int4_ops')
    ),
    index('idx_event_instances_org_id').using(
      'btree',
      table.orgId.asc().nullsLast().op('int4_ops')
    ),
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [locations.id],
      name: 'event_instances_location_id_fkey',
    }),
    foreignKey({
      columns: [table.orgId],
      foreignColumns: [orgs.id],
      name: 'event_instances_org_id_fkey',
    }),
    foreignKey({
      columns: [table.seriesId],
      foreignColumns: [events.id],
      name: 'event_instances_series_id_fkey',
    }),
  ]
);

export const attendanceTypes = pgTable('attendance_types', {
  id: serial().notNull(),
  type: varchar().notNull(),
  description: varchar(),
  created: timestamp({ mode: 'string' })
    .default(sql`timezone('utc'::text, now())`)
    .notNull(),
  updated: timestamp({ mode: 'string' })
    .default(sql`timezone('utc'::text, now())`)
    .notNull(),
});

export const authAccounts = pgTable(
  'auth_accounts',
  {
    userId: integer('user_id').notNull(),
    type: varchar().notNull(),
    provider: varchar().notNull(),
    providerAccountId: varchar('provider_account_id').notNull(),
    refreshToken: varchar('refresh_token'),
    accessToken: varchar('access_token'),
    expiresAt: timestamp('expires_at', { mode: 'string' }),
    tokenType: varchar('token_type'),
    scope: varchar(),
    idToken: varchar('id_token'),
    sessionState: varchar('session_state'),
    created: timestamp({ mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updated: timestamp({ mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'auth_accounts_user_id_fkey',
    }),
  ]
);

export const authSessions = pgTable(
  'auth_sessions',
  {
    sessionToken: text('session_token').notNull(),
    userId: integer('user_id').notNull(),
    expires: timestamp({ mode: 'string' }).notNull(),
    created: timestamp({ mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updated: timestamp({ mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'auth_sessions_user_id_fkey',
    }).onDelete('cascade'),
  ]
);

export const locations = pgTable(
  'locations',
  {
    id: serial().notNull(),
    orgId: integer('org_id').notNull(),
    name: varchar().notNull(),
    description: varchar(),
    isActive: boolean('is_active').notNull(),
    latitude: doublePrecision(),
    longitude: doublePrecision(),
    addressStreet: varchar('address_street'),
    addressCity: varchar('address_city'),
    addressState: varchar('address_state'),
    addressZip: varchar('address_zip'),
    addressCountry: varchar('address_country'),
    meta: json(),
    created: timestamp({ mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updated: timestamp({ mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    email: varchar(),
    addressStreet2: varchar('address_street2'),
  },
  (table) => [
    index('idx_locations_is_active').using(
      'btree',
      table.isActive.asc().nullsLast().op('bool_ops')
    ),
    index('idx_locations_name').using(
      'btree',
      table.name.asc().nullsLast().op('text_ops')
    ),
    index('idx_locations_org_id').using(
      'btree',
      table.orgId.asc().nullsLast().op('int4_ops')
    ),
    foreignKey({
      columns: [table.orgId],
      foreignColumns: [orgs.id],
      name: 'locations_org_id_fkey',
    }),
  ]
);

export const attendance = pgTable(
  'attendance',
  {
    id: serial().notNull(),
    userId: integer('user_id').notNull(),
    isPlanned: boolean('is_planned').notNull(),
    meta: json(),
    created: timestamp({ mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updated: timestamp({ mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    eventInstanceId: integer('event_instance_id').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.eventInstanceId],
      foreignColumns: [eventInstances.id],
      name: 'event_instance_id_fkey',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'attendance_user_id_fkey',
    }),
  ]
);

export const attendanceXAttendanceTypes = pgTable(
  'attendance_x_attendance_types',
  {
    attendanceId: integer('attendance_id').notNull(),
    attendanceTypeId: integer('attendance_type_id').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.attendanceId],
      foreignColumns: [attendance.id],
      name: 'attendance_x_attendance_types_attendance_id_fkey',
    }),
    foreignKey({
      columns: [table.attendanceTypeId],
      foreignColumns: [attendanceTypes.id],
      name: 'attendance_x_attendance_types_attendance_type_id_fkey',
    }),
  ]
);

export const events = pgTable(
  'events',
  {
    id: serial().notNull(),
    orgId: integer('org_id').notNull(),
    locationId: integer('location_id'),
    seriesId: integer('series_id'),
    isActive: boolean('is_active').notNull(),
    highlight: boolean().notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    startTime: varchar('start_time'),
    endTime: varchar('end_time'),
    dayOfWeek: dayOfWeek('day_of_week'),
    name: varchar().notNull(),
    description: varchar(),
    recurrencePattern: eventCadence('recurrence_pattern'),
    recurrenceInterval: integer('recurrence_interval'),
    indexWithinInterval: integer('index_within_interval'),
    meta: json(),
    created: timestamp({ mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updated: timestamp({ mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    email: varchar(),
  },
  (table) => [
    index('idx_events_is_active').using(
      'btree',
      table.isActive.asc().nullsLast().op('bool_ops')
    ),
    index('idx_events_location_id').using(
      'btree',
      table.locationId.asc().nullsLast().op('int4_ops')
    ),
    index('idx_events_org_id').using(
      'btree',
      table.orgId.asc().nullsLast().op('int4_ops')
    ),
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [locations.id],
      name: 'events_location_id_fkey',
    }),
    foreignKey({
      columns: [table.orgId],
      foreignColumns: [orgs.id],
      name: 'events_org_id_fkey',
    }),
    foreignKey({
      columns: [table.seriesId],
      foreignColumns: [table.id],
      name: 'events_series_id_fkey',
    }),
  ]
);

export const eventInstancesXEventTypes = pgTable(
  'event_instances_x_event_types',
  {
    eventInstanceId: integer('event_instance_id').notNull(),
    eventTypeId: integer('event_type_id').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.eventInstanceId],
      foreignColumns: [eventInstances.id],
      name: 'event_instances_x_event_types_event_instance_id_fkey',
    }),
    foreignKey({
      columns: [table.eventTypeId],
      foreignColumns: [eventTypes.id],
      name: 'event_instances_x_event_types_event_type_id_fkey',
    }),
  ]
);

export const alembicVersion = pgTable('alembic_version', {
  versionNum: varchar('version_num', { length: 32 }).notNull(),
});

export const eventTags = pgTable(
  'event_tags',
  {
    id: serial().notNull(),
    name: varchar().notNull(),
    description: varchar(),
    color: varchar(),
    created: timestamp({ mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updated: timestamp({ mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    specificOrgId: integer('specific_org_id'),
  },
  (table) => [
    foreignKey({
      columns: [table.specificOrgId],
      foreignColumns: [orgs.id],
      name: 'event_tags_specific_org_id_fkey',
    }),
  ]
);

export const eventTagsXEventInstances = pgTable(
  'event_tags_x_event_instances',
  {
    eventInstanceId: integer('event_instance_id').notNull(),
    eventTagId: integer('event_tag_id').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.eventInstanceId],
      foreignColumns: [eventInstances.id],
      name: 'event_tags_x_event_instances_event_instance_id_fkey',
    }),
    foreignKey({
      columns: [table.eventTagId],
      foreignColumns: [eventTags.id],
      name: 'event_tags_x_event_instances_event_tag_id_fkey',
    }),
  ]
);

export const eventTagsXEvents = pgTable(
  'event_tags_x_events',
  {
    eventId: integer('event_id').notNull(),
    eventTagId: integer('event_tag_id').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.eventId],
      foreignColumns: [events.id],
      name: 'event_tags_x_events_event_id_fkey',
    }),
    foreignKey({
      columns: [table.eventTagId],
      foreignColumns: [eventTags.id],
      name: 'event_tags_x_events_event_tag_id_fkey',
    }),
  ]
);

export const eventsXEventTypes = pgTable(
  'events_x_event_types',
  {
    eventId: integer('event_id').notNull(),
    eventTypeId: integer('event_type_id').notNull(),
  },
  (table) => [
    index('idx_events_x_event_types_event_id').using(
      'btree',
      table.eventId.asc().nullsLast().op('int4_ops')
    ),
    index('idx_events_x_event_types_event_type_id').using(
      'btree',
      table.eventTypeId.asc().nullsLast().op('int4_ops')
    ),
    foreignKey({
      columns: [table.eventId],
      foreignColumns: [events.id],
      name: 'events_x_event_types_event_id_fkey',
    }),
    foreignKey({
      columns: [table.eventTypeId],
      foreignColumns: [eventTypes.id],
      name: 'events_x_event_types_event_type_id_fkey',
    }),
  ]
);

export const slackSpaces = pgTable('slack_spaces', {
  id: serial().notNull(),
  teamId: varchar('team_id').notNull(),
  workspaceName: varchar('workspace_name'),
  botToken: varchar('bot_token'),
  settings: json(),
  created: timestamp({ mode: 'string' })
    .default(sql`timezone('utc'::text, now())`)
    .notNull(),
  updated: timestamp({ mode: 'string' })
    .default(sql`timezone('utc'::text, now())`)
    .notNull(),
});

export const expansions = pgTable('expansions', {
  id: serial().notNull(),
  area: varchar().notNull(),
  pinnedLat: doublePrecision('pinned_lat').notNull(),
  pinnedLon: doublePrecision('pinned_lon').notNull(),
  userLat: doublePrecision('user_lat').notNull(),
  userLon: doublePrecision('user_lon').notNull(),
  interestedInOrganizing: boolean('interested_in_organizing').notNull(),
  created: timestamp({ mode: 'string' })
    .default(sql`timezone('utc'::text, now())`)
    .notNull(),
  updated: timestamp({ mode: 'string' })
    .default(sql`timezone('utc'::text, now())`)
    .notNull(),
});

export const expansionsXUsers = pgTable(
  'expansions_x_users',
  {
    expansionId: integer('expansion_id').notNull(),
    userId: integer('user_id').notNull(),
    requestDate: timestamp('request_date', { mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    notes: varchar(),
  },
  (table) => [
    foreignKey({
      columns: [table.expansionId],
      foreignColumns: [expansions.id],
      name: 'expansions_x_users_expansion_id_fkey',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'expansions_x_users_user_id_fkey',
    }),
  ]
);

export const orgsXSlackSpaces = pgTable(
  'orgs_x_slack_spaces',
  {
    orgId: integer('org_id').notNull(),
    slackSpaceId: integer('slack_space_id').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.orgId],
      foreignColumns: [orgs.id],
      name: 'orgs_x_slack_spaces_org_id_fkey',
    }),
    foreignKey({
      columns: [table.slackSpaceId],
      foreignColumns: [slackSpaces.id],
      name: 'orgs_x_slack_spaces_slack_space_id_fkey',
    }),
  ]
);

export const positions = pgTable(
  'positions',
  {
    id: serial().notNull(),
    name: varchar().notNull(),
    description: varchar(),
    orgId: integer('org_id'),
    created: timestamp({ mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updated: timestamp({ mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    orgType: orgType('org_type'),
  },
  (table) => [
    foreignKey({
      columns: [table.orgId],
      foreignColumns: [orgs.id],
      name: 'positions_org_id_fkey',
    }),
  ]
);

export const authVerificationTokens = pgTable('auth_verification_tokens', {
  identifier: varchar().notNull(),
  token: varchar().notNull(),
  expires: timestamp({ mode: 'string' }).notNull(),
  created: timestamp({ mode: 'string' })
    .default(sql`timezone('utc'::text, now())`)
    .notNull(),
  updated: timestamp({ mode: 'string' })
    .default(sql`timezone('utc'::text, now())`)
    .notNull(),
});

export const positionsXOrgsXUsers = pgTable(
  'positions_x_orgs_x_users',
  {
    positionId: integer('position_id').notNull(),
    orgId: integer('org_id').notNull(),
    userId: integer('user_id').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.orgId],
      foreignColumns: [orgs.id],
      name: 'positions_x_orgs_x_users_org_id_fkey',
    }),
    foreignKey({
      columns: [table.positionId],
      foreignColumns: [positions.id],
      name: 'positions_x_orgs_x_users_position_id_fkey',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'positions_x_orgs_x_users_user_id_fkey',
    }),
  ]
);

export const permissions = pgTable('permissions', {
  id: serial().notNull(),
  name: varchar().notNull(),
  description: varchar(),
  created: timestamp({ mode: 'string' })
    .default(sql`timezone('utc'::text, now())`)
    .notNull(),
  updated: timestamp({ mode: 'string' })
    .default(sql`timezone('utc'::text, now())`)
    .notNull(),
});

export const rolesXPermissions = pgTable(
  'roles_x_permissions',
  {
    roleId: integer('role_id').notNull(),
    permissionId: integer('permission_id').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.permissionId],
      foreignColumns: [permissions.id],
      name: 'roles_x_permissions_permission_id_fkey',
    }),
    foreignKey({
      columns: [table.roleId],
      foreignColumns: [roles.id],
      name: 'roles_x_permissions_role_id_fkey',
    }),
  ]
);

export const roles = pgTable('roles', {
  id: serial().notNull(),
  name: regionRole().notNull(),
  description: varchar(),
  created: timestamp({ mode: 'string' })
    .default(sql`timezone('utc'::text, now())`)
    .notNull(),
  updated: timestamp({ mode: 'string' })
    .default(sql`timezone('utc'::text, now())`)
    .notNull(),
});

export const rolesXUsersXOrg = pgTable(
  'roles_x_users_x_org',
  {
    roleId: integer('role_id').notNull(),
    userId: integer('user_id').notNull(),
    orgId: integer('org_id').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.orgId],
      foreignColumns: [orgs.id],
      name: 'roles_x_users_x_org_org_id_fkey',
    }),
    foreignKey({
      columns: [table.roleId],
      foreignColumns: [roles.id],
      name: 'roles_x_users_x_org_role_id_fkey',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'roles_x_users_x_org_user_id_fkey',
    }),
  ]
);

export const updateRequests = pgTable(
  'update_requests',
  {
    id: uuid().defaultRandom().notNull(),
    token: uuid().defaultRandom().notNull(),
    regionId: integer('region_id').notNull(),
    eventId: integer('event_id'),
    eventTypeIds: integer('event_type_ids').array(),
    eventTag: varchar('event_tag'),
    eventSeriesId: integer('event_series_id'),
    eventIsSeries: boolean('event_is_series'),
    eventIsActive: boolean('event_is_active'),
    eventHighlight: boolean('event_highlight'),
    eventStartDate: date('event_start_date'),
    eventEndDate: date('event_end_date'),
    eventStartTime: varchar('event_start_time'),
    eventEndTime: varchar('event_end_time'),
    eventDayOfWeek: dayOfWeek('event_day_of_week'),
    eventName: varchar('event_name').notNull(),
    eventDescription: varchar('event_description'),
    eventRecurrencePattern: eventCadence('event_recurrence_pattern'),
    eventRecurrenceInterval: integer('event_recurrence_interval'),
    eventIndexWithinInterval: integer('event_index_within_interval'),
    eventMeta: json('event_meta'),
    eventContactEmail: varchar('event_contact_email'),
    locationName: varchar('location_name'),
    locationDescription: varchar('location_description'),
    locationAddress: varchar('location_address'),
    locationAddress2: varchar('location_address2'),
    locationCity: varchar('location_city'),
    locationState: varchar('location_state'),
    locationZip: varchar('location_zip'),
    locationCountry: varchar('location_country'),
    locationLat: real('location_lat'),
    locationLng: real('location_lng'),
    locationId: integer('location_id'),
    locationContactEmail: varchar('location_contact_email'),
    aoId: integer('ao_id'),
    aoName: varchar('ao_name'),
    aoLogo: varchar('ao_logo'),
    submittedBy: varchar('submitted_by').notNull(),
    submitterValidated: boolean('submitter_validated'),
    reviewedBy: varchar('reviewed_by'),
    reviewedAt: timestamp('reviewed_at', { mode: 'string' }),
    status: updateRequestStatus().default('pending').notNull(),
    meta: json(),
    created: timestamp({ mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updated: timestamp({ mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    requestType: requestType('request_type').notNull(),
    aoWebsite: varchar('ao_website'),
  },
  (table) => [
    foreignKey({
      columns: [table.eventId],
      foreignColumns: [events.id],
      name: 'update_requests_event_id_fkey',
    }),
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [locations.id],
      name: 'update_requests_location_id_fkey',
    }),
    foreignKey({
      columns: [table.regionId],
      foreignColumns: [orgs.id],
      name: 'update_requests_region_id_fkey',
    }),
  ]
);

export const slackUsers = pgTable(
  'slack_users',
  {
    id: serial().notNull(),
    slackId: varchar('slack_id').notNull(),
    userName: varchar('user_name').notNull(),
    email: varchar().notNull(),
    isAdmin: boolean('is_admin').notNull(),
    isOwner: boolean('is_owner').notNull(),
    isBot: boolean('is_bot').notNull(),
    userId: integer('user_id'),
    avatarUrl: varchar('avatar_url'),
    slackTeamId: varchar('slack_team_id').notNull(),
    stravaAccessToken: varchar('strava_access_token'),
    stravaRefreshToken: varchar('strava_refresh_token'),
    stravaExpiresAt: timestamp('strava_expires_at', { mode: 'string' }),
    stravaAthleteId: integer('strava_athlete_id'),
    meta: json(),
    slackUpdated: integer('slack_updated'),
    created: timestamp({ mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updated: timestamp({ mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'slack_users_user_id_fkey',
    }),
  ]
);

export const eventTypes = pgTable(
  'event_types',
  {
    id: serial().notNull(),
    name: varchar().notNull(),
    description: varchar(),
    acronym: varchar(),
    created: timestamp({ mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updated: timestamp({ mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    specificOrgId: integer('specific_org_id'),
    eventCategory: eventCategory('event_category').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.specificOrgId],
      foreignColumns: [orgs.id],
      name: 'event_types_specific_org_id_fkey',
    }),
  ]
);

export const achievements = pgTable(
  'achievements',
  {
    id: serial().notNull(),
    name: varchar().notNull(),
    description: varchar(),
    imageUrl: varchar('image_url'),
    created: timestamp({ mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updated: timestamp({ mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    specificOrgId: integer('specific_org_id'),
    autoAward: boolean('auto_award').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    autoCadence: achievementCadence('auto_cadence'),
    autoThreshold: integer('auto_threshold'),
    meta: json(),
    autoThresholdType: achievementThresholdType('auto_threshold_type'),
    autoFilters: json('auto_filters'),
  },
  (table) => [
    foreignKey({
      columns: [table.specificOrgId],
      foreignColumns: [orgs.id],
      name: 'achievements_specific_org_id_fkey',
    }),
  ]
);

export const achievementsXUsers = pgTable(
  'achievements_x_users',
  {
    achievementId: integer('achievement_id').notNull(),
    userId: integer('user_id').notNull(),
    dateAwarded: timestamp('date_awarded', { mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    awardYear: integer('award_year')
      .default(sql`'-1'`)
      .notNull(),
    awardPeriod: integer('award_period')
      .default(sql`'-1'`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.achievementId],
      foreignColumns: [achievements.id],
      name: 'achievements_x_users_achievement_id_fkey',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'achievements_x_users_user_id_fkey',
    }),
  ]
);

export const orgs = pgTable(
  'orgs',
  {
    id: serial().notNull(),
    parentId: integer('parent_id'),
    defaultLocationId: integer('default_location_id'),
    name: varchar().notNull(),
    description: varchar(),
    isActive: boolean('is_active').notNull(),
    logoUrl: varchar('logo_url'),
    website: varchar(),
    email: varchar(),
    twitter: varchar(),
    facebook: varchar(),
    instagram: varchar(),
    lastAnnualReview: date('last_annual_review'),
    meta: json(),
    created: timestamp({ mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updated: timestamp({ mode: 'string' })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    orgType: orgType('org_type').notNull(),
    aoCount: integer('ao_count').default(0),
  },
  (table) => [
    index('idx_orgs_is_active').using(
      'btree',
      table.isActive.asc().nullsLast().op('bool_ops')
    ),
    index('idx_orgs_org_type').using(
      'btree',
      table.orgType.asc().nullsLast().op('enum_ops')
    ),
    index('idx_orgs_parent_id').using(
      'btree',
      table.parentId.asc().nullsLast().op('int4_ops')
    ),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: 'orgs_parent_id_fkey',
    }),
  ]
);
