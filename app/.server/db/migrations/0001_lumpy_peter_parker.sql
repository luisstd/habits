ALTER TABLE "habit" ADD CONSTRAINT "habit_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_completion" ADD CONSTRAINT "habit_completion_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "habit_user_id_idx" ON "habit" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "habit_completion_user_id_idx" ON "habit_completion" USING btree ("user_id");