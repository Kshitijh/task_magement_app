import React, { useState } from 'react';
import Modal from './Modal';
import '../App.css';

function Dashboard() {
  const [active, setActive] = useState('Tasks');
  const [selectedTask, setSelectedTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState('');

  // Calculate number of pending tasks
  const getPendingTasksCount = () => {
    return sampleTasks.filter(task => 
      task.status === 'Pending' || task.status === 'In Progress'
    ).length;
  };

  const handleEdit = () => {
    // placeholder for edit action — wire to a modal or navigation later
    console.log(`Edit requested for ${active}`);
    alert(`Edit requested for ${active}`);
  };

  const handleApprovalRequest = () => {
    // placeholder for approval workflow - integrate with backend later
    console.log('Sending approval request:', {
      taskId: selectedTask.id,
      message: approvalMessage
    });
    alert(`Approval requested for task "${selectedTask.title}" with message: ${approvalMessage}`);
    setIsModalOpen(false);
    setSelectedTask(null);
    setApprovalMessage('');
  };

  const handleViewTask = (task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  // sample data — replace with real data later
  const sampleTasks = [
    { 
      id: 1, 
      title: 'Design homepage', 
      status: 'In Progress', 
      due: '2025-11-10',
      description: 'Create a responsive homepage design with modern UI elements',
      approver: 'Kshitij Hupare',
      priority: 'High'
    },
    { 
      id: 2, 
      title: 'Implement auth', 
      status: 'Pending', 
      due: '2025-11-15',
      description: 'Implement user authentication using JWT tokens',
      approver: 'Sagar Thorat',
      priority: 'Medium'
    },
    { 
      id: 3, 
      title: 'Write tests', 
      status: 'Done', 
      due: '2025-11-01',
      description: 'Write unit and integration tests for core features',
      approver: 'Carol Lee',
      priority: 'Low'
    },
  ];

  const sampleUsers = [
    { id: 1, name: 'Kshitij Hupare', email: 'kshitij@example.com', role: 'Admin' },
    { id: 2, name: 'Sagar Thorath', email: 'sagar@example.com', role: 'Member' },
    { id: 3, name: 'Tony Stark', email: 'tony@example.com', role: 'Member' },
  ];

  // Determine username: prefer localStorage (set by a login flow),
  // otherwise fall back to the first sample user, otherwise 'Guest'.
  const storedUser = typeof window !== 'undefined' ? window.localStorage.getItem('username') : null;
  const username = storedUser || (sampleUsers[0] && sampleUsers[0].name) || 'Guest';

  const TasksTable = ({ rows }) => (
    <table className="table">
      <thead>
        <tr>
          <th>#</th>
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
            <td>{r.title}</td>
            <td>{r.status}</td>
            <td>{r.due}</td>
            <td>
              <button 
                className="view-button"
                onClick={() => handleViewTask(r)}
              >
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
        </tr>
      </thead>
      <tbody>
        {rows.map((u) => (
          <tr key={u.id}>
            <td>{u.id}</td>
            <td>{u.name}</td>
            <td>{u.email}</td>
            <td>{u.role}</td>
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
          onClick={() => setActive('Tasks')}
        >
          {username}
        </button>
        <button
          className={`sidebar-button ${active === 'Tasks' ? 'active' : ''}`}
          onClick={() => setActive('Tasks')}
        >
          Tasks
          {getPendingTasksCount() > 0 && (
            <span className="notification-badge">
              {getPendingTasksCount()}
            </span>
          )}
        </button>
        <button
          className={`sidebar-button ${active === 'Users' ? 'active' : ''}`}
          onClick={() => setActive('Users')}
        >
          Users
        </button>
      </aside>

      <main className="content">
        <div className="table-toolbar">
          <div className="table-title">{active}</div>
          <div className="table-actions">
            <button className="edit-button" onClick={handleEdit}>
              {active === 'Tasks' ? 'Add Tasks' : 'Add Users'}
            </button>
          </div>
        </div>

        {active === 'Tasks' ? (
          <TasksTable rows={sampleTasks} />
        ) : (
          <UsersTable rows={sampleUsers} />
        )}
      </main>

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
              <span className="task-detail-label">Title:</span>
              <span className="task-detail-value">{selectedTask.title}</span>
            </div>
            <div className="task-detail-row">
              <span className="task-detail-label">Status:</span>
              <span className="task-detail-value">{selectedTask.status}</span>
            </div>
            <div className="task-detail-row">
              <span className="task-detail-label">Due Date:</span>
              <span className="task-detail-value">{selectedTask.due}</span>
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
              <span className="task-detail-value">{selectedTask.description}</span>
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
    </div>
  );
}

export default Dashboard;
