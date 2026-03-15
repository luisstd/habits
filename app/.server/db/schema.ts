import { boolean, index, integer, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { user } from './auth-schema'

export const habit = pgTable(
	'habit',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		color: text('color').notNull(),
		archived: boolean('archived').default(false).notNull(),
		position: integer('position').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [index('habit_user_id_idx').on(table.userId)],
)

export const habitCompletion = pgTable(
	'habit_completion',
	{
		id: text('id').primaryKey(),
		habitId: text('habit_id')
			.notNull()
			.references(() => habit.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		date: text('date').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		unique('habit_completion_habit_id_date_unique').on(table.habitId, table.date),
		index('habit_completion_user_id_idx').on(table.userId),
	],
)
