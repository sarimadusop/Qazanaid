#!/bin/bash

# Configuration
# Run this from the project root directory
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/qazanaid_backup_$TIMESTAMP.sql"
CONTAINER_NAME="kazana-db"
DB_USER="postgres"
DB_NAME="Qazanaid"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

echo "📂 Starting backup for $DB_NAME..."

# Run pg_dump via Docker
# We use -U postgres and assume the password is provided via .env or not needed for local docker exec
docker exec $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "✅ Backup success: $BACKUP_FILE"
    # Keep only last 7 days of backups to save disk space
    find $BACKUP_DIR -type f -name "*.sql" -mtime +7 -delete
    echo "🧹 Old backups cleaned."
else
    echo "❌ Backup failed!"
    # Remove empty/failed file
    rm -f $BACKUP_FILE
fi
