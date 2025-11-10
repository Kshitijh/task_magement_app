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

class User(UserBase):
    id: str

class TaskBase(BaseModel):
    project_ID: str
    work_description: str
    empl_name: str
    status: str

class TaskCreate(TaskBase):
    pass

class Task(TaskBase):
    id: str
    start_datetime: datetime
    end_datetime: datetime

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
    if current_user["role"].lower() != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view users")
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
async def update_user(user_id: str, user: UserCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"].lower() != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to update users")
    
    from bson.objectid import ObjectId
    update_data = user.dict(exclude_unset=True)
    if "password" in update_data:
        update_data["password_hash"] = hashlib.md5(update_data.pop("password").encode()).hexdigest()
    
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
    print(current_user) 

    if current_user["role"].lower() == "employee":
        query["empl_name"] = current_user["username"]
    
    tasks = list(db.work_log.find(query))
    for task in tasks:
        task["id"] = str(task.pop("_id"))
    return tasks

@app.post("/tasks", response_model=Task)
async def create_task(task: TaskCreate, current_user: dict = Depends(get_current_user)):
    task_dict = task.dict()
    task_dict["date"] = datetime.utcnow()
    result = db.work_log.insert_one(task_dict)
    created_task = db.work_log.find_one({"_id": result.inserted_id})
    created_task["id"] = str(created_task.pop("_id"))
    return created_task

@app.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task: TaskCreate, current_user: dict = Depends(get_current_user)):
    from bson.objectid import ObjectId
    # Check if user has permission to update this task
    existing_task = db.work_log.find_one({"_id": ObjectId(task_id)})
    if not existing_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if current_user["role"].lower() == "employee" and existing_task["empl_name"] != current_user["username"]:
        raise HTTPException(status_code=403, detail="Not authorized to update this task")
    
    update_data = task.dict(exclude_unset=True)
    result = db.work_log.find_one_and_update(
        {"_id": ObjectId(task_id)},
        {"$set": update_data},
        return_document=True
    )
    
    result["id"] = str(result.pop("_id"))
    return result

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
