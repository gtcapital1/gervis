CREATE TABLE "session" (
	"sid" varchar(255) PRIMARY KEY NOT NULL,
	"sess" json,
	"expire" timestamp
);
