ALTER TABLE "regions" ADD COLUMN "ingestedAt" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "workouts" ADD COLUMN "ingestedAt" timestamp DEFAULT now();