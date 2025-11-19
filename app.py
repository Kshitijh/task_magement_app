from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
import hashlib
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import jwt
from datetime import timedelta
import os

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your React app's URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URI = "mongodb+srv://kshitijhupare07_db_user:Kshitij1001@worklog.lckec0h.mongodb.net/"
client = MongoClient(MONGO_URI)
# Assuming 'client' is your MongoClient instance
DB_NAME = "daily_work_log" # Or load this from environment variables
db = client.get_database(DB_NAME) # <-- Provide the database name here

# JWT Configuration
SECRET_KEY = "your-secret-key"  # In production, use a secure secret key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Pydantic models for request/response validation
class UserBase(BaseModel):
    username: str
    Email: str
    role: str

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    Email: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None

class User(UserBase):
    id: str

class TaskBase(BaseModel):
    project_code: str
    title: str
    description: str
    status: str
    start_datetime: datetime
    end_datetime: datetime
    approver: str
    assigned_to: str
    priority: str

class TaskCreate(TaskBase):
    pass  # All fields are inherited from TaskBase

class Task(TaskBase):
    id: str

class ApprovalRequest(BaseModel):
    message: str
    status: str = "Pending Approval"

class ApprovalResponse(BaseModel):
    approved: bool
    approved_by: str
    approved_at: datetime
    approval_message: Optional[str] = None

# Authentication helper functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str):
    return hashlib.md5(plain_password.encode()).hexdigest() == hashed_password

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = db.user_cred.find_one({"username": username})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# Authentication endpoints
@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = db.user_cred.find_one({"username": form_data.username})
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    access_token = create_access_token({"sub": user["username"]})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "username": user["username"],
            "role": user["role"],
            "email": user["Email"]
        }
    }

# User endpoints
@app.get("/users", response_model=List[User])
async def get_users(current_user: dict = Depends(get_current_user)):

    users = list(db.user_cred.find({}, {"password_hash": 0}))
    for user in users:
        user["id"] = str(user.pop("_id"))
    return users

@app.post("/users", response_model=User)
async def create_user(user: UserCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"].lower() != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to create users")
    
    if db.user_cred.find_one({"username": user.username}):
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user_dict = user.dict()
    user_dict["password_hash"] = hashlib.md5(user_dict.pop("password").encode()).hexdigest()
    result = db.user_cred.insert_one(user_dict)
    created_user = db.user_cred.find_one({"_id": result.inserted_id}, {"password_hash": 0})
    created_user["id"] = str(created_user.pop("_id"))
    return created_user

@app.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user: UserUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"].lower() != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to update users")
    
    from bson.objectid import ObjectId
    
    # Check if user exists
    existing_user = db.user_cred.find_one({"_id": ObjectId(user_id)})
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Start with empty update data
    update_data = {}
    
    # Only include fields that were provided and have non-None values
    if user.username is not None:
        update_data["username"] = user.username
    
    if user.Email is not None:
        update_data["Email"] = user.Email
    
    if user.role is not None:
        update_data["role"] = user.role
    
    if user.password:  # Only update password if a non-empty string is provided
        update_data["password_hash"] = hashlib.md5(user.password.encode()).hexdigest()
    
    # If no fields to update were provided, return existing user
    if not update_data:
        return {
            "id": str(existing_user["_id"]),
            "username": existing_user["username"],
            "Email": existing_user["Email"],
            "role": existing_user["role"]
        }
    
    print(f"Updating user {user_id} with data:", update_data)  # Debug log
    
    # Update user in database
    result = db.user_cred.find_one_and_update(
        {"_id": ObjectId(user_id)},
        {"$set": update_data},
        return_document=True
    )
    
    if result is None:
        raise HTTPException(status_code=404, detail="User not found")
    result["id"] = str(result.pop("_id"))
    return result

@app.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"].lower() != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete users")
    
    from bson.objectid import ObjectId
    result = db.user_cred.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}

# Task endpoints
@app.get("/tasks", response_model=List[Task])
async def get_tasks(current_user: dict = Depends(get_current_user)):
    query = {}
    
    # Admin can see all tasks
    if current_user["role"].lower() != "admin":
        # Non-admin users can only see tasks assigned to them
        query["assigned_to"] = current_user["username"]
        
    # Optional: Add logging for debugging
    print(f"User {current_user['username']} with role {current_user['role']} querying tasks with filter: {query}")
    tasks = list(db.work_log.find(query))
    formatted_tasks = []
    for task in tasks:
        # Transform the task data to match the new model
        formatted_task = {
            "id": str(task["_id"]),
            "project_code": task.get("project_code", ""),
            "title": task.get("title", task.get("work_description", "").split("\n")[0]),
            "description": task.get("description", task.get("work_description", "")),
            "status": task.get("status", "Pending"),
            "start_datetime": task.get("start_datetime", task.get("start_date")),
            "end_datetime": task.get("end_datetime", task.get("end_date")),
            "approver": task.get("approver", ""),
            "assigned_to": task.get("assigned_to", ""),
            "priority": task.get("priority", "Medium"),
            "approval_status": task.get("approval_status"),
            "approval_message": task.get("approval_message"),
            "approval_requested_by": task.get("approval_requested_by"),
            "approval_requested_at": task.get("approval_requested_at"),
            "approved_by": task.get("approved_by"),
            "approved_at": task.get("approved_at"),
        }
        formatted_tasks.append(formatted_task)
    return formatted_tasks

@app.post("/tasks", response_model=Task)
async def create_task(task: TaskCreate, current_user: dict = Depends(get_current_user)):
    try:
        # Convert the task to dictionary and add metadata
        task_dict = task.dict()
        task_dict["created_at"] = datetime.utcnow()
        task_dict["created_by"] = current_user["username"]
    
        # Validate that end_datetime is after start_datetime
        if task_dict["end_datetime"] <= task_dict["start_datetime"]:
            raise HTTPException(
                status_code=400,
                detail="End datetime must be after start datetime"
            )
        
        # Store the task in the database
        result = db.work_log.insert_one(task_dict)
        
        # Retrieve and format the created task
        created_task = db.work_log.find_one({"_id": result.inserted_id})
        formatted_task = {
            "id": str(created_task["_id"]),
            "project_code": created_task["project_code"],
            "title": created_task["title"],
            "description": created_task["description"],
            "status": created_task["status"],
            "start_datetime": created_task["start_datetime"],
            "end_datetime": created_task["end_datetime"],
            "approver": created_task["approver"],
            "assigned_to": created_task["assigned_to"],
            "priority": created_task["priority"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return formatted_task

@app.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task: TaskCreate, current_user: dict = Depends(get_current_user)):
    from bson.objectid import ObjectId
    
    # Check if task exists
    existing_task = db.work_log.find_one({"_id": ObjectId(task_id)})
    if not existing_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check permissions
    if current_user["role"].lower() == "employee" and existing_task["assigned_to"] != current_user["username"]:
        raise HTTPException(status_code=403, detail="Not authorized to update this task")
    
    # Get update data, preserving existing values for missing fields
    update_data = {
        "project_code": task.project_code or existing_task.get("project_code"),
        "title": task.title or existing_task.get("title"),
        "description": task.description or existing_task.get("description"),
        "status": task.status or existing_task.get("status"),
        "start_datetime": task.start_datetime or existing_task.get("start_datetime"),
        "end_datetime": task.end_datetime or existing_task.get("end_datetime"),
        "approver": task.approver or existing_task.get("approver"),
        "assigned_to": task.assigned_to or existing_task.get("assigned_to"),
        "priority": task.priority or existing_task.get("priority"),
        "updated_at": datetime.utcnow(),
        "updated_by": current_user["username"]
    }
    
    # Update the task
    result = db.work_log.find_one_and_update(
        {"_id": ObjectId(task_id)},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Format the response
    formatted_result = {
        "id": str(result["_id"]),
        "project_code": result["project_code"],
        "title": result["title"],
        "description": result["description"],
        "status": result["status"],
        "start_datetime": result["start_datetime"],
        "end_datetime": result["end_datetime"],
        "approver": result["approver"],
        "assigned_to": result["assigned_to"],
        "priority": result["priority"]
    }
    return formatted_result

@app.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    from bson.objectid import ObjectId
    # Check if user has permission to delete this task
    existing_task = db.work_log.find_one({"_id": ObjectId(task_id)})
    if not existing_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if current_user["role"].lower() == "employee" and existing_task["empl_name"] != current_user["username"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this task")
    
    result = db.work_log.delete_one({"_id": ObjectId(task_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully"}

# Approval endpoints
@app.post("/tasks/{task_id}/request-approval")
async def request_approval(task_id: str, approval: ApprovalRequest, current_user: dict = Depends(get_current_user)):
    from bson.objectid import ObjectId
    
    # Get the task
    task = db.work_log.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Update task with approval request
    update_data = {
        "approval_status": "Pending Approval",
        "approval_message": approval.message,
        "approval_requested_by": current_user["username"],
        "approval_requested_at": datetime.utcnow(),
        "status": approval.status
    }
    
    db.work_log.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": update_data}
    )
    
    return {
        "message": "Approval request sent successfully",
        "approver": task.get("approver", ""),
        "task_id": task_id
    }

@app.post("/tasks/{task_id}/approve")
async def approve_task(task_id: str, approval_message: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    from bson.objectid import ObjectId
    
    # Get the task
    task = db.work_log.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check if current user is the approver
    if task.get("approver") != current_user["username"]:
        raise HTTPException(status_code=403, detail="Only the assigned approver can approve this task")
    
    # Update task with approval
    update_data = {
        "approval_status": "Approved",
        "approved_by": current_user["username"],
        "approved_at": datetime.utcnow(),
        "status": "Approved"
    }
    
    db.work_log.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": update_data}
    )
    
    return {
        "message": "Task approved successfully",
        "approved_by": current_user["username"],
        "approved_at": datetime.utcnow()
    }

@app.post("/tasks/{task_id}/reject")
async def reject_task(task_id: str, rejection_message: str, current_user: dict = Depends(get_current_user)):
    from bson.objectid import ObjectId
    
    # Get the task
    task = db.work_log.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check if current user is the approver
    if task.get("approver") != current_user["username"]:
        raise HTTPException(status_code=403, detail="Only the assigned approver can reject this task")
    
    # Update task with rejection
    update_data = {
        "approval_status": "Rejected",
        "rejected_by": current_user["username"],
        "rejected_at": datetime.utcnow(),
        "rejection_message": rejection_message,
        "status": "Rejected"
    }
    
    db.work_log.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": update_data}
    )
    
    return {
        "message": "Task rejected",
        "rejected_by": current_user["username"],
        "rejected_at": datetime.utcnow()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
