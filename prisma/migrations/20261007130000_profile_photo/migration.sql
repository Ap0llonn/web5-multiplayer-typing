CREATE TABLE "ProfilePhoto" (
    "authUserId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProfilePhoto_pkey" PRIMARY KEY ("authUserId"),
    CONSTRAINT "ProfilePhoto_size_check" CHECK (octet_length("data") BETWEEN 1 AND 2097152)
);
ALTER TABLE "ProfilePhoto" ADD CONSTRAINT "ProfilePhoto_authUserId_fkey"
    FOREIGN KEY ("authUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
