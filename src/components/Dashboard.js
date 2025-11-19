import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Modal from "./Modal";
import "../App.css";

import './Dashboard.css';

const API_BASE_URL = "http://localhost:8000";

function Dashboard() {
  const navigate = useNavigate();
  const [active, setActive] = useState("Tasks");
  const [selectedTask, setSelectedTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [approvalMessage, setApprovalMessage] = useState("");
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approvers, setApprovers] = useState([]);
  const [assignees, setAssignees] = useState([]);
  // const [searchTerm, setSearchTerm] = useState("");

  // Setup axios instance with authentication
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
      navigate('/login');
      return;
    }
    setCurrentUser(user);
    
    // Always fetch users to populate dropdowns, even for non-admin users
    fetchUsers();
    fetchTasks();
  }, []);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "Member"
  });
  const [newTask, setNewTask] = useState({
    projectCode: "",
    title: "",
    status: "Pending",
    startDateTime: "",
    endDateTime: "",
    approver: "",
    assignedTo: "",
    priority: "Medium",
    description: ""
  });

  // Fetch tasks from API
  const fetchTasks = async () => {
    try {
      const response = await api.get('/tasks');
      console.log('Response----------------',response);
      console.log(response.data);
      
      // Transform the data to match the table structure
      const transformedTasks = response.data.map(task => ({
        id: task.id,
        project_code: task.project_code,
        title: task.title,
        status: task.status || "Pending",
        start_datetime: task.start_datetime,
        end_datetime: task.end_datetime,
        description: task.description,
        approver: task.approver,
        assigned_to: task.assigned_to,
        priority: task.priority || "Medium",
        created_at: task.created_at,
        created_by: task.created_by,
        approval_status: task.approval_status,
        approval_message: task.approval_message,
        approval_requested_by: task.approval_requested_by,
        approval_requested_at: task.approval_requested_at,
        approved_by: task.approved_by,
        approved_at: task.approved_at,
      }));

      console.log("Transformed tasks:", transformedTasks);
      setTasks(transformedTasks);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      const usersList = response.data.map(user => ({
        id: user.id,
        name: user.username,
        email: user.Email,
        role: user.role
      }));
      setUsers(usersList);
      
      // Filter users based on their roles from user_cred table
      setApprovers(usersList.filter(user => user.role.toLowerCase() === 'admin'));
      setAssignees(usersList.filter(user => user.role.toLowerCase() === 'member' || user.role.toLowerCase() === 'employee'));
      
    } catch (error) {
      console.error('Error fetching users:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  // Calculate number of pending tasks
  const getPendingTasksCount = () => {
    return tasks.filter(
      (task) => task.status === "Pending" || task.status === "In Progress"
    ).length;
  };

  const handleEdit = () => {
    if (active === "Tasks") {
      setIsAddTaskModalOpen(true);
    } else {
      if (currentUser.role.toLowerCase() !== 'admin') {
        alert('Only administrators can manage users');
        return;
      }
      setIsAddUserModalOpen(true);
    }
  };

  const handleAddUser = async () => {
    try {
      await api.post('/users', {
        username: newUser.username,
        Email: newUser.email,
        password: newUser.password,
        role: newUser.role
      });
      
      await fetchUsers();
      setIsAddUserModalOpen(false);
      setNewUser({
        username: "",
        email: "",
        password: "",
        role: "Member"
      });
    } catch (error) {
      console.error('Error adding user:', error);
      alert(error.response?.data?.message || 'Error adding user');
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser({
      id: user.id,
      username: user.name,
      email: user.email,
      role: user.role,
      password: "", // We don't show existing password
      // Store original values for comparison
      originalUsername: user.name,
      originalEmail: user.email,
      originalRole: user.role
    });
    setIsEditUserModalOpen(true);
  };

  const handleUpdateUser = async () => {
    try {
      if (!selectedUser) {
        throw new Error("No user selected for update");
      }

      // Start with empty update data
      const updateData = {};

      // Track what fields are being updated for the confirmation message
      const updatedFields = [];

      // Check each field and only include changed ones
      if (selectedUser.username !== selectedUser.originalUsername && selectedUser.username) {
        updateData.username = selectedUser.username;
        updatedFields.push("username");
      }
      
      if (selectedUser.email !== selectedUser.originalEmail && selectedUser.email) {
        updateData.Email = selectedUser.email;
        updatedFields.push("email");
      }
      
      if (selectedUser.role !== selectedUser.originalRole && selectedUser.role) {
        updateData.role = selectedUser.role;
        updatedFields.push("role");
      }

      // Only include password if it was entered
      if (selectedUser.password && selectedUser.password.trim() !== "") {
        updateData.password = selectedUser.password;
        updatedFields.push("password");
      }

      // Only make the API call if there are changes to update
      if (Object.keys(updateData).length > 0) {
        // Show confirmation with specific fields being updated
        const confirmMessage = `Are you sure you want to update the following fields: ${updatedFields.join(", ")}?`;
        
        if (window.confirm(confirmMessage)) {
          console.log("Updating user with data:", updateData); // Debug log
          await api.put(`/users/${selectedUser.id}`, updateData);
          await fetchUsers();
          setIsEditUserModalOpen(false);
          setSelectedUser(null);
          alert("User updated successfully!");
        }
      } else {
        alert("No changes detected");
      }
    } catch (error) {
      console.error('Error updating user:', error);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || 'Error updating user';
      alert(errorMessage);
    }
  };

  const handleDeleteUser = async () => {
    try {
      await api.delete(`/users/${selectedUser.id}`);
      await fetchUsers();
      setIsEditUserModalOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error.response?.data?.message || 'Error deleting user');
    }
  };

  const handleAddTask = async () => {
    try {
      // Validate required fields
      if (!newTask.projectCode || !newTask.title || !newTask.startDateTime || 
          !newTask.endDateTime || !newTask.approver || !newTask.assignedTo) {
        alert('Please fill in all required fields');
        return;
      }

      // Validate dates
      const startDate = new Date(newTask.startDateTime);
      const endDate = new Date(newTask.endDateTime);
      if (endDate <= startDate) {
        alert('End date must be after start date');
        return;
      }

      // Format task data according to backend schema
      const taskData = {
        project_code: newTask.projectCode,
        title: newTask.title,
        description: newTask.description,
        status: newTask.status,
        start_datetime: startDate.toISOString(),
        end_datetime: endDate.toISOString(),
        approver: newTask.approver,
        assigned_to: newTask.assignedTo,
        priority: newTask.priority
      };

      // Send to API
      const response = await api.post('/tasks', taskData);
      
      if (response.status === 200) {
        // Refresh task list and reset form
        await fetchTasks();
        setIsAddTaskModalOpen(false);
        setNewTask({
          projectCode: "",
          title: "",
          status: "Pending",
          startDateTime: "",
          endDateTime: "",
          approver: "",
          assignedTo: "",
          priority: "Medium",
          description: ""
        });

        // Show success message
        alert('Task created successfully!');
      }
    } catch (error) {
      console.error('Error adding task:', error);
      alert(error.response?.data?.detail || 'Failed to add task');
    }
  };

  const handleApprovalRequest = async () => {
    try {
      if (!approvalMessage.trim()) {
        alert('Please enter a message for the approval request');
        return;
      }

      await api.post(`/tasks/${selectedTask.id}/request-approval`, {
        message: approvalMessage,
        status: 'Pending Approval'
      });
      
      await fetchTasks();
      alert('Approval request sent successfully to ' + selectedTask.approver + '!');
      setIsModalOpen(false);
      setSelectedTask(null);
      setApprovalMessage("");
    } catch (error) {
      console.error('Error sending approval request:', error);
      alert(error.response?.data?.detail || 'Error sending approval request');
    }
  };

  const handleApproveTask = async () => {
    try {
      // Check if current user is the approver
      if (currentUser.username !== selectedTask.approver) {
        alert('Only the assigned approver can approve this task');
        return;
      }

      const confirmApprove = window.confirm('Are you sure you want to approve this task?');
      if (!confirmApprove) return;

      await api.post(`/tasks/${selectedTask.id}/approve`, null, {
        params: { approval_message: approvalMessage }
      });
      
      await fetchTasks();
      alert('Task approved successfully!');
      setIsModalOpen(false);
      setSelectedTask(null);
      setApprovalMessage("");
    } catch (error) {
      console.error('Error approving task:', error);
      alert(error.response?.data?.detail || 'Error approving task');
    }
  };
const handleUpdateTaskStatus = async (taskId, newStatus) => {
  try {
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    await api.put(`/tasks/${taskId}`, {
      project_code: task.project_code,
      title: task.title,
      description: task.description,
      status: newStatus,
      start_datetime: task.start_datetime,
      end_datetime: task.end_datetime,
      approver: task.approver,
      assigned_to: task.assigned_to,
      priority: task.priority
    });
    
    await fetchTasks(); // Refresh tasks from server
  } catch (error) {
    console.error('Error updating task:', error);
    alert(error.response?.data?.detail || 'Error updating task status');
    await fetchTasks(); // Refresh to ensure UI shows correct state
  }
};

const handleDeleteTask = async (taskId) => {
  try {
    await api.delete(`/tasks/${taskId}`);
    setTasks(tasks.filter(task => task.id !== taskId));
  } catch (error) {
    console.error("Error deleting task:", error);
  }
};

  const handleViewTask = (task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  // // Filter tasks based on search input
  // const filteredTasks = tasks.filter(task =>
  //   task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //   task.projectCode.toLowerCase().includes(searchTerm.toLowerCase())
  // );

  // // Filter users based on search input
  // const filteredUsers = users.filter(user =>
  //   user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //   user.email.toLowerCase().includes(searchTerm.toLowerCase())
  // );

  // Get username from current user object
  const username = currentUser?.username || "Guest";

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    const date = new Date(dateTimeStr);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const TasksTable = ({ rows }) => (
    <table className="table">
      <thead>
        <tr>
          <th>#</th>
          <th>Project Code</th>
          <th>Title</th>
          <th>Status</th>
          <th>Start Date</th>
          <th>End Date</th>
          <th>Assigned To</th>
          <th>Priority</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((task,index) => (
          <tr key={task.id}>
            <td>{index + 1}</td>
            <td>{task.project_code}</td>
            <td>{task.title}</td>
            <td>
              <select
                value={task.status}
                onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value)}
                className="status-select"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>
            </td>
            <td>{formatDateTime(task.start_datetime)}</td>
            <td>{formatDateTime(task.end_datetime)}</td>
            <td>{task.assigned_to}</td>
            <td>
              <span className={`priority-badge ${(task.priority || 'medium').toLowerCase()}`}>
                {task.priority || 'Medium'}
              </span>
            </td>
            <td className="actionbutton">
              <button className="view-button" onClick={() => handleViewTask(task)}>
                View
              </button>
              <button 
                className="delete-button" 
                onClick={() => handleDeleteTask(task.id)}
                style={{ marginLeft: '8px', backgroundColor: '#dc3545' }}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const UsersTable = ({ rows }) => (
    <table className="table">
      <thead>
        <tr>
          <th>#</th>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((u, index) => (
          <tr key={u.id}>
            <td>{index + 1}</td>
            <td>{u.name}</td>
            <td>{u.email}</td>
            <td>{u.role}</td>
            <td>
              <button className="edit-user-button" onClick={() => handleEditUser(u)}>
                Edit
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="dashboard-root">
      <aside className="sidebar">
        <button
          className="sidebar-home-button"
          onClick={() => setActive("Tasks")}
        >
          {username}
        </button>
        <button
          className={`sidebar-button ${active === "Tasks" ? "active" : ""}`}
          onClick={() => setActive("Tasks")}
        >
          Tasks
          {getPendingTasksCount() > 0 && (
            <span className="notification-badge">{getPendingTasksCount()}</span>
          )}
        </button>
        <button
          className={`sidebar-button ${active === "Users" ? "active" : ""} ${currentUser?.role.toLowerCase() !== 'admin' ? 'disabled' : ''}`}
          onClick={() => setActive("Users")}
        >
          Users
        </button>
        <div className="sidebar-spacer"></div>
          <button
          className="logout-button"
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login');
          }}
        >
          Logout
        </button>
      </aside>

      <main className="content">
        <div className="table-toolbar">
          <div className="table-title">{active}</div>
          <div className="table-actions">
            {loading ? (
              <div>Loading...</div>
            ) : (
              <button className="edit-button" onClick={handleEdit}>
                {active === "Tasks" ? "Add Tasks" : "Add Users"}
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="table-wrapper">
            {active === "Tasks" ? (
              <TasksTable rows={tasks} />
            ) : (
              <UsersTable rows={users} />
            )}
          </div>
        )}
      </main>      <Modal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        title="Add New Task"
      >
        <div className="task-form">
          <div className="task-form-row">
            <label htmlFor="projectCode">Project Code:</label>
            <input
              type="text"
              id="projectCode"
              value={newTask.projectCode}
              onChange={(e) => setNewTask({...newTask, projectCode: e.target.value})}
              placeholder="e.g., UAPR-001, UAPR-002"
              required
            />
          </div>
          <div className="task-form-row">
            <label htmlFor="title">Title:</label>
            <input
              type="text"
              id="title"
              value={newTask.title}
              onChange={(e) => setNewTask({...newTask, title: e.target.value})}
              required
            />
          </div>
          <div className="task-form-row">
            <label htmlFor="status">Status:</label>
            <select
              id="status"
              value={newTask.status}
              onChange={(e) => setNewTask({...newTask, status: e.target.value})}
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
          </div>
          <div className="task-form-row">
            <label htmlFor="startDateTime">Start Date-Time:</label>
            <input
              type="datetime-local"
              id="startDateTime"
              value={newTask.startDateTime}
              onChange={(e) => setNewTask({...newTask, startDateTime: e.target.value})}
              required
            />
          </div>
          <div className="task-form-row">
            <label htmlFor="endDateTime">End Date-Time:</label>
            <input
              type="datetime-local"
              id="endDateTime"
              value={newTask.endDateTime}
              onChange={(e) => setNewTask({...newTask, endDateTime: e.target.value})}
              required
            />
          </div>
          <div className="task-form-row">
            <label htmlFor="approver">Approver:</label>
            <select
              id="approver"
              value={newTask.approver}
              onChange={(e) => setNewTask({...newTask, approver: e.target.value})}
              required
            >
              <option value="">Select an approver</option>
              {approvers.map(user => (
                <option key={user.id} value={user.name}>
                  {user.name} ({user.role})
                </option>
              ))}
            </select>
          </div>
          <div className="task-form-row">
            <label htmlFor="assignedTo">Assign to:</label>
            <select
              id="assignedTo"
              value={newTask.assignedTo}
              onChange={(e) => setNewTask({...newTask, assignedTo: e.target.value})}
              required
            >
              <option value="">Select a team member</option>
              {assignees.map(user => (
                <option key={user.id} value={user.name}>
                  {user.name} ({user.role})
                </option>
              ))}
            </select>
          </div>
          <div className="task-form-row">
            <label htmlFor="priority">Priority:</label>
            <select
              id="priority"
              value={newTask.priority}
              onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <div className="task-form-row">
            <label htmlFor="description">Description:</label>
            <textarea
              id="description"
              value={newTask.description}
              onChange={(e) => setNewTask({...newTask, description: e.target.value})}
              required
            />
          </div>
          <div className="modal-footer">
            <button
              className="add-task-button"
              onClick={handleAddTask}
              disabled={
                !newTask.projectCode || 
                !newTask.title || 
                !newTask.startDateTime || 
                !newTask.endDateTime || 
                !newTask.approver || 
                !newTask.assignedTo ||
                !newTask.description
              }
            >
              Add Task
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTask(null);
        }}
        title="Task Details"
      >
        {selectedTask && (
          <div className="task-details">
            <div className="task-detail-row">
              <span className="task-detail-label">Project Code:</span>
              <span className="task-detail-value">{selectedTask.project_code}</span>
            </div>
            <div className="task-detail-row">
              <span className="task-detail-label">Title:</span>
              <span className="task-detail-value">{selectedTask.title}</span>
            </div>
            <div className="task-detail-row">
              <span className="task-detail-label">Status:</span>
              <span className={`task-detail-value task-status status-${selectedTask.status.toLowerCase().replace(' ', '-')}`}>
                {selectedTask.status}
              </span>
            </div>
            <div className="task-dates">
              <div className="task-detail-row">
                <span className="task-detail-label">Start Date:</span>
                <span className="task-detail-value">{formatDateTime(selectedTask.start_datetime)}</span>
              </div>
              <div className="task-detail-row">
                <span className="task-detail-label">End Date:</span>
                <span className="task-detail-value">{formatDateTime(selectedTask.end_datetime)}</span>
              </div>
            </div>
            <div className="task-detail-row">
              <span className="task-detail-label">Assigned To:</span>
              <span className="task-detail-value">{selectedTask.assigned_to}</span>
            </div>
            <div className="task-detail-row">
              <span className="task-detail-label">Approver:</span>
              <span className="task-detail-value">{selectedTask.approver}</span>
            </div>
            <div className="task-detail-row">
              <span className="task-detail-label">Priority:</span>
              <span className={`task-detail-value priority-badge ${selectedTask.priority.toLowerCase()}`}>
                {selectedTask.priority}
              </span>
            </div>
            <div className="task-detail-row">
              <span className="task-detail-label">Description:</span>
              <div className="task-description">
                {selectedTask.description}
              </div>
            </div>
            {selectedTask.created_by && (
              <div className="task-detail-row">
                <span className="task-detail-label">Created By:</span>
                <span className="task-detail-value">{selectedTask.created_by}</span>
              </div>
            )}
            {selectedTask.created_at && (
              <div className="task-detail-row">
                <span className="task-detail-label">Created At:</span>
                <span className="task-detail-value">{formatDateTime(selectedTask.created_at)}</span>
              </div>
            )}
            {selectedTask.approval_status && (
              <div className="task-detail-row">
                <span className="task-detail-label">Approval Status:</span>
                <span className={`task-detail-value ${
                  selectedTask.approval_status === 'Approved' ? 'status-approved' : 
                  selectedTask.approval_status === 'Rejected' ? 'status-rejected' : 
                  'status-pending'
                }`}>
                  {selectedTask.approval_status}
                </span>
              </div>
            )}
            {selectedTask.approval_message && (
              <div className="task-detail-row">
                <span className="task-detail-label">Message:</span>
                <div className="task-detail-value">{selectedTask.approval_message}</div>
              </div>
            )}
            {selectedTask.approved_by && (
              <div className="task-detail-row">
                <span className="task-detail-label">Approved By:</span>
                <span className="task-detail-value">{selectedTask.approved_by}</span>
              </div>
            )}

            <div className="task-message-box">
              <label className="task-message-label" htmlFor="approval-message">
                {currentUser?.username === selectedTask.approver ? 
                  'Approval Response Message (Optional)' : 
                  'Message'}
              </label>
              <textarea
                id="approval-message"
                className="task-message-input"
                value={approvalMessage}
                onChange={(e) => setApprovalMessage(e.target.value)}
                placeholder={currentUser?.username === selectedTask.approver ?
                  'Add any comments or feedback for the approval...' :
                  'Add any additional comments or context for the approval request...'}
              />
            </div>

            <div className="modal-footer">
              {currentUser?.username === selectedTask.approver && (
                <button
                  className="approve-button"
                  onClick={handleApproveTask}
                  style={{ backgroundColor: '#10b981' }}
                >
                  Approve Task
                </button>
              )}
              <button
                className="approval-button"
                onClick={handleApprovalRequest}
                disabled={!approvalMessage.trim()}
              >
                Send
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        title="Add New User"
      >
        <div className="task-form">
          <div className="task-form-row">
            <label htmlFor="username">Username:</label>
            <input
              type="text"
              id="username"
              value={newUser.username}
              onChange={(e) => setNewUser({...newUser, username: e.target.value})}
              required
            />
          </div>
          <div className="task-form-row">
            <label htmlFor="email">Email ID:</label>
            <input
              type="email"
              id="email"
              value={newUser.email}
              onChange={(e) => setNewUser({...newUser, email: e.target.value})}
              required
            />
          </div>
          <div className="task-form-row">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              value={newUser.password}
              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              required
            />
          </div>
          <div className="task-form-row">
            <label htmlFor="role">Role:</label>
            <select
              id="role"
              value={newUser.role}
              onChange={(e) => setNewUser({...newUser, role: e.target.value})}
            >
              <option value="Member">Member</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <div className="modal-footer">
            <button
              className="add-task-button"
              onClick={handleAddUser}
              disabled={!newUser.username || !newUser.email || !newUser.password}
            >
              Add User
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isEditUserModalOpen}
        onClose={() => {
          setIsEditUserModalOpen(false);
          setSelectedUser(null);
        }}
        title="Edit User"
      >
        {selectedUser && (
          <div className="task-form">
            <div className="task-form-row">
              <label htmlFor="edit-username">Username:</label>
              <input
                type="text"
                id="edit-username"
                value={selectedUser.username || ''}
                onChange={(e) => {
                  const value = e.target.value.trim();
                  setSelectedUser({
                    ...selectedUser,
                    username: value
                  });
                }}
                required
              />
              {selectedUser.username !== selectedUser.originalUsername && selectedUser.username && (
                <small style={{ color: 'blue' }}>Username will be updated</small>
              )}
            </div>
            <div className="task-form-row">
              <label htmlFor="edit-email">Email ID:</label>
              <input
                type="email"
                id="edit-email"
                value={selectedUser.email || ''}
                onChange={(e) => {
                  const value = e.target.value.trim();
                  setSelectedUser({
                    ...selectedUser,
                    email: value
                  });
                }}
                required
              />
              {selectedUser.email !== selectedUser.originalEmail && selectedUser.email && (
                <small style={{ color: 'blue' }}>Email will be updated</small>
              )}
            </div>
            <div className="task-form-row">
              <label htmlFor="edit-password">New Password:</label>
              <input
                type="password"
                id="edit-password"
                value={selectedUser.password || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedUser({
                    ...selectedUser,
                    password: value
                  });
                }}
                placeholder="Leave blank to keep current password"
              />
              {selectedUser.password && (
                <small style={{ color: 'blue' }}>Password will be updated</small>
              )}
            </div>
            <div className="task-form-row">
              <label htmlFor="edit-role">Role:</label>
              <select
                id="edit-role"
                value={selectedUser.role || 'Member'}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedUser({
                    ...selectedUser,
                    role: value
                  });
                }}
              >
                <option value="Member">Member</option>
                <option value="Admin">Admin</option>
              </select>
              {selectedUser.role !== selectedUser.originalRole && (
                <small style={{ color: 'blue' }}>Role will be updated</small>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="delete-user-button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this user?')) {
                    handleDeleteUser();
                  }
                }}
              >
                Delete User
              </button>
              <button
                className="add-task-button"
                onClick={handleUpdateUser}
                disabled={!selectedUser.username || !selectedUser.email}
              >
                Update User
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Dashboard;
