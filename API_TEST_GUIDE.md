# MP3 API Testing Guide

## User Endpoints

### Create User
```bash
# Create a new user (201 Created)
curl -i -X POST -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test2@test.com"}' \
  http://localhost:3000/api/users
```

### List/Query Users
```bash
# Get all users
curl -i http://localhost:3000/api/users

# Sort users by name
curl -i "http://localhost:3000/api/users?sort=%7B%22name%22:1%7D"

# Filter users by ID
curl -G --data-urlencode 'where={"_id":"USER_ID"}' http://localhost:3000/api/users

# Select specific fields
curl -i -G --data-urlencode 'select={"name":1,"email":1}' http://localhost:3000/api/users

# Pagination
curl -i "http://localhost:3000/api/users?skip=10&limit=5"

# Count documents
curl -i "http://localhost:3000/api/users?count=true"
```

### Update User
```bash
# Update user (replace USER_ID with actual ID)
curl -i -X PUT -H "Content-Type: application/json" \
  -d '{"name":"Updated User","email":"updated@test.com"}' \
  http://localhost:3000/api/users/USER_ID
```

### Delete User
```bash
# Delete user (replace USER_ID with actual ID)
curl -i -X DELETE http://localhost:3000/api/users/USER_ID
```

## Task Endpoints

### Create Task
```bash
# Create a new task (201 Created)
curl -i -X POST -H "Content-Type: application/json" \
  -d '{
    "name": "Test Task",
    "description": "This is a test task",
    "deadline": "2025-12-31",
    "completed": false
  }' \
  http://localhost:3000/api/tasks
```

### List/Query Tasks
```bash
# Get all tasks
curl -i http://localhost:3000/api/tasks

# Get completed tasks
curl -i -G --data-urlencode 'where={"completed":true}' http://localhost:3000/api/tasks

# Sort tasks by deadline
curl -i -G --data-urlencode 'sort={"deadline":1}' http://localhost:3000/api/tasks

# Pagination
curl -i "http://localhost:3000/api/tasks?skip=5&limit=10"

# Count total tasks
curl -i "http://localhost:3000/api/tasks?count=true"

# Select specific fields
curl -i -G --data-urlencode 'select={"name":1,"deadline":1}' http://localhost:3000/api/tasks
```

### Update Task
```bash
# Update task (replace TASK_ID with actual ID)
curl -i -X PUT -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Task",
    "description": "This task has been updated",
    "deadline": "2025-12-31",
    "completed": true
  }' \
  http://localhost:3000/api/tasks/TASK_ID
```

### Assign Task to User
```bash
# Assign task to user (replace TASK_ID and USER_ID with actual IDs)
curl -i -X PUT -H "Content-Type: application/json" \
  -d '{
    "name": "Assigned Task",
    "description": "This task is assigned",
    "deadline": "2025-12-31",
    "completed": false,
    "assignedUser": "USER_ID",
    "assignedUserName": "User Name"
  }' \
  http://localhost:3000/api/tasks/TASK_ID
```

### Delete Task
```bash
# Delete task (replace TASK_ID with actual ID)
curl -i -X DELETE http://localhost:3000/api/tasks/TASK_ID
```

## Error Cases to Test

1. Try to create user without required fields (should return 400):
```bash
curl -i -X POST -H "Content-Type: application/json" -d '{}' http://localhost:3000/api/users
```

2. Try to create user with duplicate email (should return 400):
```bash
curl -i -X POST -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"existing@email.com"}' \
  http://localhost:3000/api/users
```

3. Try to access non-existent resource (should return 404):
```bash
curl -i http://localhost:3000/api/users/nonexistentid
```

4. Try to create task without required fields (should return 400):
```bash
curl -i -X POST -H "Content-Type: application/json" -d '{}' http://localhost:3000/api/tasks
```

## HTTP Status Codes

The API uses the following status codes:
- 200: Success
- 201: Created (for successful POST requests)
- 400: Bad Request (validation errors, malformed input)
- 404: Not Found
- 500: Server Error