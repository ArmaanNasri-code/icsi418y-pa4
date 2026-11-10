
import { useEffect, useState } from 'react'
import './App.css'

const API = 'http://localhost:5050'

function App() {
  const [page, setPage] = useState('auth')
  const [isLogin, setIsLogin] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)

  const [signupData, setSignupData] = useState({
    f_name: '',
    l_name: '',
    username: '',
    password: '',
  })

  const [loginData, setLoginData] = useState({
    username: '',
    password: '',
  })

  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [members, setMembers] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [stories, setStories] = useState([])
  const [editingStory, setEditingStory] = useState(null)
  const emptyStory = () => ({ title: '', description: '', priority: 'Medium', status: 'To Do', assigned_user_id: '' })
  const [storyData, setStoryData] = useState(emptyStory())

  const [projectData, setProjectData] = useState({
    name: '',
    description: '',
    status: 'Planning',
    project_lead_id: '',
  })

  const notify = (text, isError = false) => {
    setMessage(text)
    setError(isError)
  }

  const request = async (path, options = {}) => {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Request failed.')
    }

    return data
  }

  const loadUsers = async () => {
    try {
      const data = await request('/users')
      setUsers(data)
    } catch (err) {
      notify(err.message, true)
    }
  }

  const loadProjects = async () => {
    try {
      const data = await request('/projects')
      setProjects(data)
    } catch (err) {
      notify(err.message, true)
    }
  }

  const loadMembers = async (projectId) => {
    if (!projectId) {
      setMembers([])
      return
    }

    try {
      const data = await request(`/projects/${projectId}/members`)
      setMembers(data)
    } catch (err) {
      notify(err.message, true)
    }
  }

  useEffect(() => {
    if (page !== 'auth') {
      loadUsers()
      loadProjects()
    }
  }, [page])

  useEffect(() => {
    if (page === 'backlog' && selectedProject) {
      let active = true
      Promise.all([request(`/projects/${selectedProject}/stories`), request(`/projects/${selectedProject}/members`)]).then(([items, people]) => {
        if (active) { setStories(items); setMembers(people) }
      }).catch(err => { if (active) notify(err.message, true) })
      return () => { active = false }
    }
  }, [selectedProject, page])

  const refreshStories = async () => {
    if (selectedProject) setStories(await request(`/projects/${selectedProject}/stories`))
  }

  const saveStory = async (e) => {
    e.preventDefault()
    try {
      const path = `/projects/${selectedProject}/stories${editingStory ? `/${editingStory}` : ''}`
      const result = await request(path, { method: editingStory ? 'PUT' : 'POST', body: JSON.stringify(storyData) })
      notify(result.message)
      setEditingStory(null)
      setStoryData(emptyStory())
      await refreshStories()
    } catch (err) { notify(err.message, true) }
  }

  const deleteStory = async (story) => {
    if (!window.confirm(`Delete story "${story.title}"?`)) return
    try {
      const result = await request(`/projects/${selectedProject}/stories/${story._id}`, { method: 'DELETE' })
      notify(result.message)
      setEditingStory(null)
      setStoryData(emptyStory())
      await refreshStories()
    } catch (err) { notify(err.message, true) }
  }

  useEffect(() => {
    if (page === 'members') {
      loadMembers(selectedProject)
    }
  }, [selectedProject, page])

  const handleSignup = async (e) => {
    e.preventDefault()

    try {
      const data = await request('/signup', {
        method: 'POST',
        body: JSON.stringify(signupData),
      })

      notify(data.message)
      setSignupData({
        f_name: '',
        l_name: '',
        username: '',
        password: '',
      })

      await loadUsers()
    } catch (err) {
      notify(err.message, true)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()

    try {
      await request('/login', {
        method: 'POST',
        body: JSON.stringify(loginData),
      })

      notify('Login successful.')
      setPage('projects')
    } catch (err) {
      notify(err.message, true)
    }
  }

  const handleCreateProject = async (e) => {
    e.preventDefault()

    try {
      const data = await request('/projects', {
        method: 'POST',
        body: JSON.stringify(projectData),
      })

      notify(data.message)

      setProjectData({
        name: '',
        description: '',
        status: 'Planning',
        project_lead_id: '',
      })

      await loadProjects()
    } catch (err) {
      notify(err.message, true)
    }
  }

  const handleAddMember = async (e) => {
    e.preventDefault()

    if (!selectedProject || !selectedUser) {
      notify('Please select a project and user.', true)
      return
    }

    try {
      const data = await request(
        `/projects/${selectedProject}/members`,
        {
          method: 'POST',
          body: JSON.stringify({ user_id: selectedUser }),
        }
      )

      notify(data.message)
      setSelectedUser('')
      await loadMembers(selectedProject)
    } catch (err) {
      notify(err.message, true)
    }
  }

  const handleRemoveMember = async (userId) => {
    try {
      const data = await request(
        `/projects/${selectedProject}/members/${userId}`,
        { method: 'DELETE' }
      )

      notify(data.message)
      await loadMembers(selectedProject)
    } catch (err) {
      notify(err.message, true)
    }
  }

  const userName = (user) => {
    if (!user) return 'Unknown user'
    return `${user.f_name} ${user.l_name} (${user.username})`
  }

  const changePage = (nextPage) => {
    setPage(nextPage)
    setMessage('')
  }

  const currentProject = projects.find(
    (project) => project._id === selectedProject
  )

  if (page === 'auth') {
    return (
      <div className="container">
        <div className="form-box">
          <h1>{isLogin ? 'Login' : 'Sign Up'}</h1>

          <div className="toggle-buttons">
            <button
              className={isLogin ? 'active' : ''}
              onClick={() => {
                setIsLogin(true)
                setMessage('')
              }}
            >
              Login
            </button>
            <button
              className={!isLogin ? 'active' : ''}
              onClick={() => {
                setIsLogin(false)
                setMessage('')
              }}
            >
              Sign Up
            </button>
          </div>

          {isLogin ? (
            <form onSubmit={handleLogin}>
              <input
                placeholder="Username"
                value={loginData.username}
                onChange={(e) =>
                  setLoginData({
                    ...loginData,
                    username: e.target.value,
                  })
                }
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={loginData.password}
                onChange={(e) =>
                  setLoginData({
                    ...loginData,
                    password: e.target.value,
                  })
                }
                required
              />
              <button className="submit-button" type="submit">
                Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup}>
              {['f_name', 'l_name', 'username', 'password'].map(
                (field) => (
                  <input
                    key={field}
                    type={field === 'password' ? 'password' : 'text'}
                    placeholder={
                      {
                        f_name: 'First Name',
                        l_name: 'Last Name',
                        username: 'Username',
                        password: 'Password',
                      }[field]
                    }
                    value={signupData[field]}
                    onChange={(e) =>
                      setSignupData({
                        ...signupData,
                        [field]: e.target.value,
                      })
                    }
                    required
                  />
                )
              )}
              <button className="submit-button" type="submit">
                Sign Up
              </button>
            </form>
          )}

          {message && (
            <p className={error ? 'message error' : 'message success'}>
              {message}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Project Management</h1>
          <p>ICSI 418Y - Programming Assignment 4</p>
        </div>

        <button
          className="logout-button"
          onClick={() => {
            setLoginData({ username: '', password: '' })
            changePage('auth')
          }}
        >
          Logout
        </button>
      </header>

      <nav className="navbar">
        <button
          className={page === 'projects' ? 'active' : ''}
          onClick={() => changePage('projects')}
        >
          View Projects
        </button>
        <button
          className={page === 'create' ? 'active' : ''}
          onClick={() => changePage('create')}
        >
          Create Project
        </button>
        <button
          className={page === 'members' ? 'active' : ''}
          onClick={() => changePage('members')}
        >
          Manage Members
        </button>
        <button className={page === 'backlog' ? 'active' : ''} onClick={() => changePage('backlog')}>Project Backlog</button>
      </nav>

      <main className="dashboard-content">
        {message && (
          <p className={error ? 'message error' : 'message success'}>
            {message}
          </p>
        )}

        {page === 'backlog' && (
          <section className="panel">
            <h2>Project Backlog</h2>
            <label>Select Project</label>
            <select value={selectedProject} onChange={e => {
              setSelectedProject(e.target.value)
              setStories([]); setMembers([]); setEditingStory(null); setStoryData(emptyStory()); setMessage('')
            }}>
              <option value="">Choose a project</option>
              {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
            {selectedProject && <>
              <h3>{editingStory ? 'Edit User Story' : 'Create User Story'}</h3>
              <form onSubmit={saveStory}>
                <label>Title</label>
                <input required value={storyData.title} onChange={e => setStoryData({...storyData, title:e.target.value})} />
                <label>Description (As a ..., I want ..., so that ...)</label>
                <textarea required value={storyData.description} onChange={e => setStoryData({...storyData, description:e.target.value})} />
                <label>Priority</label>
                <select value={storyData.priority} onChange={e => setStoryData({...storyData, priority:e.target.value})}>
                  {['High','Medium','Low'].map(v => <option key={v}>{v}</option>)}
                </select>
                {editingStory && <><label>Status</label><select value={storyData.status} onChange={e => setStoryData({...storyData, status:e.target.value})}>
                  {['To Do','In Progress','Done'].map(v => <option key={v}>{v}</option>)}
                </select></>}
                <label>Assigned Member</label>
                <select value={storyData.assigned_user_id} onChange={e => setStoryData({...storyData, assigned_user_id:e.target.value})}>
                  <option value="">Unassigned</option>
                  {members.filter(m => m.user_id).map(m => <option key={m.user_id._id} value={m.user_id._id}>{userName(m.user_id)}</option>)}
                </select>
                <button className="submit-button" type="submit">{editingStory ? 'Save Changes' : 'Create Story'}</button>
                {editingStory && <button type="button" className="secondary-button" onClick={() => { setEditingStory(null); setStoryData(emptyStory()) }}>Cancel</button>}
              </form>
              <h3>Stories ({stories.length})</h3>
              {stories.length === 0 ? <p>No user stories for this project yet.</p> : <div className="member-list">
                {stories.map(story => <div key={story._id} className="story-item">
                  <h3>{story.title}</h3>
                  <p>{story.description}</p>
                  <p><strong>Priority:</strong> {story.priority} | <strong>Status:</strong> {story.status}</p>
                  <p><strong>Assigned:</strong> {story.assigned_user_id ? userName(story.assigned_user_id) : 'Unassigned'}</p>
                  <button type="button" className="secondary-button" onClick={() => {
                    setEditingStory(story._id)
                    setStoryData({ title:story.title, description:story.description, priority:story.priority, status:story.status, assigned_user_id:story.assigned_user_id?._id || '' })
                  }}>Edit</button>{' '}
                  <button type="button" className="remove-button" onClick={() => deleteStory(story)}>Delete</button>
                </div>)}
              </div>}
            </>}
          </section>
        )}
        {page === 'create' && (
          <section className="panel">
            <h2>Create Project</h2>
            <p>Fill in the details to create a new project.</p>

            <form onSubmit={handleCreateProject}>
              <label>Project Name</label>
              <input
                value={projectData.name}
                onChange={(e) =>
                  setProjectData({
                    ...projectData,
                    name: e.target.value,
                  })
                }
                placeholder="Enter project name"
                required
              />

              <label>Description</label>
              <textarea
                value={projectData.description}
                onChange={(e) =>
                  setProjectData({
                    ...projectData,
                    description: e.target.value,
                  })
                }
                placeholder="Describe the project"
                required
              />

              <label>Status</label>
              <select
                value={projectData.status}
                onChange={(e) =>
                  setProjectData({
                    ...projectData,
                    status: e.target.value,
                  })
                }
              >
                <option value="Planning">Planning</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
              </select>

              <label>Project Lead</label>
              <select
                value={projectData.project_lead_id}
                onChange={(e) =>
                  setProjectData({
                    ...projectData,
                    project_lead_id: e.target.value,
                  })
                }
                required
              >
                <option value="">Select a registered user</option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {userName(user)}
                  </option>
                ))}
              </select>

              <button className="submit-button" type="submit">
                Create Project
              </button>
            </form>
          </section>
        )}

        {page === 'projects' && (
          <section>
            <div className="section-heading">
              <h2>All Projects</h2>
              <button onClick={loadProjects}>Refresh</button>
            </div>

            {projects.length === 0 ? (
              <div className="panel">
                <p>No projects yet. Create your first project!</p>
              </div>
            ) : (
              <div className="project-grid">
                {projects.map((project) => (
                  <div className="project-card" key={project._id}>
                    <div className="card-title-row">
                      <h3>{project.name}</h3>
                      <span className="status-badge">
                        {project.status}
                      </span>
                    </div>

                    <p>{project.description}</p>

                    <div className="project-lead">
                      <strong>Project Lead:</strong>
                      <p>{userName(project.project_lead_id)}</p>
                    </div>

                    <button
                      className="secondary-button"
                      onClick={() => {
                        setSelectedProject(project._id)
                        changePage('members')
                      }}
                    >
                      Manage Members
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {page === 'members' && (
          <section className="panel">
            <h2>Manage Project Members</h2>

            <label>Select Project</label>
            <select
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value)
                setSelectedUser('')
                setMembers([])
                setMessage('')
              }}
            >
              <option value="">Choose a project</option>
              {projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </select>

            {selectedProject && (
              <>
                <h3>Current Members</h3>

                {members.length === 0 ? (
                  <p>No members found.</p>
                ) : (
                  <div className="member-list">
                    {members.map((membership) => {
                      const user = membership.user_id

                      if (!user) return null

                      const isLead =
                        String(currentProject?.project_lead_id?._id) ===
                        String(user._id)

                      return (
                        <div
                          className="member-row"
                          key={membership._id}
                        >
                          <span>
                            {userName(user)}
                            {isLead && (
                              <strong className="lead-label">
                                Project Lead
                              </strong>
                            )}
                          </span>

                          {!isLead && (
                            <button
                              className="remove-button"
                              onClick={() =>
                                handleRemoveMember(user._id)
                              }
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                <h3>Add Member</h3>

                <form onSubmit={handleAddMember}>
                  <label>Registered User</label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    required
                  >
                    <option value="">Select a user</option>
                    {users.map((user) => (
                      <option key={user._id} value={user._id}>
                        {userName(user)}
                      </option>
                    ))}
                  </select>

                  <button className="submit-button" type="submit">
                    Add Member
                  </button>
                </form>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default App
