import React, { useState } from "react";
import Modal from "./Modal";
import "../App.css";

function Dashboard() {
  const [active, setActive] = useState("Tasks");
  const [selectedTask, setSelectedTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [approvalMessage, setApprovalMessage] = useState("");
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

  // Calculate number of pending tasks
  const getPendingTasksCount = () => {
    return sampleTasks.filter(
      (task) => task.status === "Pending" || task.status === "In Progress"
    ).length;
  };

  const handleEdit = () => {
    if (active === "Tasks") {
      setIsAddTaskModalOpen(true);
    } else {
      setIsAddUserModalOpen(true);
    }
  };

  const handleAddUser = () => {
    // Here you would typically make an API call to save the user
    console.log("Adding new user:", newUser);
    const newUserWithId = {
      ...newUser,
      id: sampleUsers.length + 1,
      name: newUser.username, // For consistency with existing data
    };
    sampleUsers.push(newUserWithId);
    setIsAddUserModalOpen(false);
    setNewUser({
      username: "",
      email: "",
      password: "",
      role: "Member"
    });
  };

  const handleEditUser = (user) => {
    setSelectedUser({
      ...user,
      username: user.name,
      password: "" // We don't show existing password
    });
    setIsEditUserModalOpen(true);
  };

  const handleUpdateUser = () => {
    // Here you would typically make an API call to update the user
    const userIndex = sampleUsers.findIndex(u => u.id === selectedUser.id);
    if (userIndex !== -1) {
      sampleUsers[userIndex] = {
        ...selectedUser,
        name: selectedUser.username,
      };
    }
    setIsEditUserModalOpen(false);
    setSelectedUser(null);
  };

  const handleDeleteUser = () => {
    // Here you would typically make an API call to delete the user
    const userIndex = sampleUsers.findIndex(u => u.id === selectedUser.id);
    if (userIndex !== -1) {
      // Remove user from array
      sampleUsers.splice(userIndex, 1);
      // Close modal
      setIsEditUserModalOpen(false);
      setSelectedUser(null);
    }
  };

  const handleAddTask = () => {
    // Here you would typically make an API call to save the task
    console.log("Adding new task:", newTask);
    const newTaskWithId = {
      ...newTask,
      id: sampleTasks.length + 1,
      due: newTask.endDateTime // Store full date-time
    };
    sampleTasks.push(newTaskWithId);
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
  };

  const handleApprovalRequest = () => {
    // placeholder for approval workflow - integrate with backend later
    console.log("Sending approval request:", {
      taskId: selectedTask.id,
      message: approvalMessage,
    });
    alert(
      `Approval requested for task "${selectedTask.title}" with message: ${approvalMessage}`
    );
    setIsModalOpen(false);
    setSelectedTask(null);
    setApprovalMessage("");
  };

  const handleViewTask = (task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  // sample data — replace with real data later
  const sampleTasks = [
    {
      id: 1,
      projectCode: "UAPR-001",
      title: "Design homepage",
      status: "In Progress",
      due: "2025-11-10T14:30",
      description:
        "Create a responsive homepage design with modern UI elements",
      approver: "Kshitij Hupare",
      priority: "High",
    },
    {
      id: 2,
      projectCode: "UAPR-002",
      title: "Implement auth",
      status: "Pending",
      due: "2025-11-15T16:00",
      description: "Implement user authentication using JWT tokens",
      approver: "Sagar Thorat",
      priority: "Medium",
    },
    {
      id: 3,
      projectCode: "UAPR-003",
      title: "Write tests",
      status: "Done",
      due: "2025-11-01T10:00",
      description: "Write unit and integration tests for core features",
      approver: "Carol Lee",
      priority: "Low",
    },
  ];

  const sampleUsers = [
    {
      id: 1,
      name: "Kshitij Hupare",
      email: "kshitij@example.com",
      role: "Admin",
    },
    {
      id: 2,
      name: "Sagar Thorath",
      email: "sagar@example.com",
      role: "Member",
    },
    { id: 3, name: "Tony Stark", email: "tony@example.com", role: "Member" },
  ];

  // Determine username: prefer localStorage (set by a login flow),
  // otherwise fall back to the first sample user, otherwise 'Guest'.
  const storedUser =
    typeof window !== "undefined"
      ? window.localStorage.getItem("username")
      : null;
  const username =
    storedUser || (sampleUsers[0] && sampleUsers[0].name) || "Guest";

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
          <th>Tasks</th>
          <th>Status</th>
          <th>Due</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{r.id}</td>
            <td>{r.projectCode}</td>
            <td>{r.title}</td>
            <td>{r.status}</td>
            <td>{formatDateTime(r.due)}</td>
            <td>
              <button className="view-button" onClick={() => handleViewTask(r)}>
                View
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
        {rows.map((u) => (
          <tr key={u.id}>
            <td>{u.id}</td>
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
          className={`sidebar-button ${active === "Users" ? "active" : ""}`}
          onClick={() => setActive("Users")}
        >
          Users
        </button>
        <div className="sidebar-spacer"></div>
        <button
          className="logout-button"
          onClick={() => {
            // Here you would typically handle logout logic
            console.log('Logging out...');
            // For demo purposes, you might want to clear localStorage
            localStorage.removeItem('username');
            // Redirect to login page or handle logout as needed
          }}
        >
          Logout
        </button>
      </aside>

      <main className="content">
        <div className="table-toolbar">
          <div className="table-title">{active}</div>
          <div className="table-actions">
            <button className="edit-button" onClick={handleEdit}>
              {active === "Tasks" ? "Add Tasks" : "Add Users"}
            </button>
          </div>
        </div>

        {active === "Tasks" ? (
          <TasksTable rows={sampleTasks} />
        ) : (
          <UsersTable rows={sampleUsers} />
        )}
      </main>

      <Modal
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
              placeholder="e.g., FE-001, BE-001"
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
              {sampleUsers.map(user => (
                <option key={user.id} value={user.name}>{user.name}</option>
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
              <option value="">Select a user</option>
              {sampleUsers.map(user => (
                <option key={user.id} value={user.name}>{user.name}</option>
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
              disabled={!newTask.title || !newTask.endDateTime || !newTask.approver}
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
              <span className="task-detail-value">{selectedTask.projectCode}</span>
            </div>
            <div className="task-detail-row">
              <span className="task-detail-label">Title:</span>
              <span className="task-detail-value">{selectedTask.title}</span>
            </div>
            <div className="task-detail-row">
              <span className="task-detail-label">Status:</span>
              <span className="task-detail-value">{selectedTask.status}</span>
            </div>
            <div className="task-detail-row">
              <span className="task-detail-label">Due Date:</span>
              <span className="task-detail-value">{formatDateTime(selectedTask.due)}</span>
            </div>
            <div className="task-detail-row">
              <span className="task-detail-label">Approver:</span>
              <span className="task-detail-value">{selectedTask.approver}</span>
            </div>
            <div className="task-detail-row">
              <span className="task-detail-label">Priority:</span>
              <span className="task-detail-value">{selectedTask.priority}</span>
            </div>
            <div className="task-detail-row">
              <span className="task-detail-label">Description:</span>
              <span className="task-detail-value">
                {selectedTask.description}
              </span>
            </div>

            <div className="task-message-box">
              <label className="task-message-label" htmlFor="approval-message">
                Message for Approval
              </label>
              <textarea
                id="approval-message"
                className="task-message-input"
                value={approvalMessage}
                onChange={(e) => setApprovalMessage(e.target.value)}
                placeholder="Add any additional comments or context for the approval request..."
              />
            </div>

            <div className="modal-footer">
              <button
                className="approval-button"
                onClick={handleApprovalRequest}
                disabled={!approvalMessage.trim()}
              >
                Send for Approval
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
                value={selectedUser.username}
                onChange={(e) => setSelectedUser({...selectedUser, username: e.target.value})}
                required
              />
            </div>
            <div className="task-form-row">
              <label htmlFor="edit-email">Email ID:</label>
              <input
                type="email"
                id="edit-email"
                value={selectedUser.email}
                onChange={(e) => setSelectedUser({...selectedUser, email: e.target.value})}
                required
              />
            </div>
            <div className="task-form-row">
              <label htmlFor="edit-password">New Password:</label>
              <input
                type="password"
                id="edit-password"
                value={selectedUser.password}
                onChange={(e) => setSelectedUser({...selectedUser, password: e.target.value})}
                placeholder="Leave blank to keep current password"
              />
            </div>
            <div className="task-form-row">
              <label htmlFor="edit-role">Role:</label>
              <select
                id="edit-role"
                value={selectedUser.role}
                onChange={(e) => setSelectedUser({...selectedUser, role: e.target.value})}
              >
                <option value="Member">Member</option>
                <option value="Admin">Admin</option>
              </select>
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
