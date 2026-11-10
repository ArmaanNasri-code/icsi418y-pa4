
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
require('dotenv').config()

const app = express()

app.use(cors())
app.use(express.json())

const userSchema = new mongoose.Schema({
  f_name: { type: String, required: true },
  l_name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
})

const User = mongoose.model('User', userSchema)

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  status: {
    type: String,
    required: true,
    enum: ['Planning', 'Active', 'Completed'],
  },
  project_lead_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
})

const Project = mongoose.model('Project', projectSchema)

const projectMembershipSchema = new mongoose.Schema({
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
})

projectMembershipSchema.index(
  { project_id: 1, user_id: 1 },
  { unique: true }
)

const ProjectMembership = mongoose.model(
  'ProjectMembership',
  projectMembershipSchema
)

const storySchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, immutable: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  priority: { type: String, enum: ['High', 'Medium', 'Low'], required: true },
  status: { type: String, enum: ['To Do', 'In Progress', 'Done'], default: 'To Do', required: true },
  assigned_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { collection: 'UserStories' })
const UserStory = mongoose.model('UserStory', storySchema)
const validId = (id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)
const priorities = ['High', 'Medium', 'Low']
const statuses = ['To Do', 'In Progress', 'Done']

async function validateStory(body, projectId, editing = false) {
  if (!body || typeof body.title !== 'string' || !body.title.trim() ||
      typeof body.description !== 'string' || !body.description.trim()) return 'Title and description are required.'
  if (!priorities.includes(body.priority)) return 'Invalid priority.'
  if (editing && !statuses.includes(body.status)) return 'Invalid story status.'
  if (body.assigned_user_id !== null && body.assigned_user_id !== undefined && body.assigned_user_id !== '') {
    if (!validId(body.assigned_user_id)) return 'Invalid assigned user ID.'
    if (!await User.exists({ _id: body.assigned_user_id })) return 'Assigned user does not exist.'
    if (!await ProjectMembership.exists({ project_id: projectId, user_id: body.assigned_user_id })) return 'Assigned user must belong to this project.'
  }
  return null
}

app.get('/projects/:projectId/stories', async (req, res) => {
  try {
    const { projectId } = req.params
    if (!validId(projectId)) return res.status(400).json({ message: 'Invalid project ID.' })
    if (!await Project.exists({ _id: projectId })) return res.status(404).json({ message: 'Project does not exist.' })
    const stories = await UserStory.find({ project_id: projectId }).populate('assigned_user_id', 'f_name l_name username').sort({ _id: -1 })
    res.json(stories)
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }) }
})

app.post('/projects/:projectId/stories', async (req, res) => {
  try {
    const { projectId } = req.params
    if (!validId(projectId)) return res.status(400).json({ message: 'Invalid project ID.' })
    if (!await Project.exists({ _id: projectId })) return res.status(404).json({ message: 'Project does not exist.' })
    const issue = await validateStory(req.body, projectId)
    if (issue) return res.status(400).json({ message: issue })
    const { title, description, priority, assigned_user_id } = req.body
    const story = await UserStory.create({ project_id: projectId, title: title.trim(), description: description.trim(), priority, status: 'To Do', assigned_user_id: assigned_user_id || null })
    res.status(201).json({ message: 'Story created successfully.', story })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }) }
})

app.put('/projects/:projectId/stories/:storyId', async (req, res) => {
  try {
    const { projectId, storyId } = req.params
    if (!validId(projectId) || !validId(storyId)) return res.status(400).json({ message: 'Invalid project or story ID.' })
    if (!await Project.exists({ _id: projectId })) return res.status(404).json({ message: 'Project does not exist.' })
    const story = await UserStory.findOne({ _id: storyId, project_id: projectId })
    if (!story) return res.status(404).json({ message: 'Story not found in this project.' })
    if (req.body.project_id !== undefined && String(req.body.project_id) !== projectId) return res.status(400).json({ message: 'Cannot move story to another project.' })
    const issue = await validateStory(req.body, projectId, true)
    if (issue) return res.status(400).json({ message: issue })
    const { title, description, priority, status, assigned_user_id } = req.body
    Object.assign(story, { title: title.trim(), description: description.trim(), priority, status, assigned_user_id: assigned_user_id || null })
    await story.save()
    res.json({ message: 'Story updated successfully.', story })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }) }
})

app.delete('/projects/:projectId/stories/:storyId', async (req, res) => {
  try {
    const { projectId, storyId } = req.params
    if (!validId(projectId) || !validId(storyId)) return res.status(400).json({ message: 'Invalid project or story ID.' })
    if (!await Project.exists({ _id: projectId })) return res.status(404).json({ message: 'Project does not exist.' })
    const story = await UserStory.findOneAndDelete({ _id: storyId, project_id: projectId })
    if (!story) return res.status(404).json({ message: 'Story not found in this project.' })
    res.json({ message: 'Story deleted successfully.' })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }) }
})

app.post('/signup', async (req, res) => {
  try {
    const { f_name, l_name, username, password } = req.body

    if (!f_name || !l_name || !username || !password) {
      return res.status(400).json({
        message: 'All signup fields are required.',
      })
    }

    const existingUser = await User.findOne({ username })

    if (existingUser) {
      return res.status(400).json({
        message: 'Username already exists.',
      })
    }

    const newUser = new User({
      f_name,
      l_name,
      username,
      password,
    })

    await newUser.save()

    res.status(201).json({
      message: 'User created successfully.',
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error.' })
  }
})

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({
        message: 'Username and password are required.',
      })
    }

    const user = await User.findOne({ username })

    if (!user) {
      return res.status(400).json({
        message: 'Username does not exist.',
      })
    }

    if (user.password !== password) {
      return res.status(400).json({
        message: 'Incorrect password.',
      })
    }

    res.status(200).json({
      message: 'Login successful.',
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error.' })
  }
})

app.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password')
    res.json(users)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error.' })
  }
})

app.post('/projects', async (req, res) => {
  try {
    const { name, description, status, project_lead_id } = req.body

    if (
      !name?.trim() ||
      !description?.trim() ||
      !status ||
      !project_lead_id
    ) {
      return res.status(400).json({
        message: 'All project fields are required.',
      })
    }

    if (!['Planning', 'Active', 'Completed'].includes(status)) {
      return res.status(400).json({
        message: 'Invalid project status.',
      })
    }

    if (!mongoose.isValidObjectId(project_lead_id)) {
      return res.status(400).json({
        message: 'Invalid project lead ID.',
      })
    }

    const lead = await User.findById(project_lead_id)

    if (!lead) {
      return res.status(404).json({
        message: 'Project lead does not exist.',
      })
    }

    const project = new Project({
      name: name.trim(),
      description: description.trim(),
      status,
      project_lead_id,
    })

    await project.save()

    try {
      await ProjectMembership.create({
        project_id: project._id,
        user_id: project_lead_id,
      })
    } catch (error) {
      await Project.findByIdAndDelete(project._id)
      throw error
    }

    res.status(201).json({
      message: 'Project created successfully.',
      project,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error.' })
  }
})

app.get('/projects', async (req, res) => {
  try {
    const projects = await Project.find().populate(
      'project_lead_id',
      'f_name l_name username'
    )

    res.json(projects)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error.' })
  }
})

app.get('/projects/:projectId/members', async (req, res) => {
  try {
    const { projectId } = req.params

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({
        message: 'Invalid project ID.',
      })
    }

    const project = await Project.findById(projectId)

    if (!project) {
      return res.status(404).json({
        message: 'Project does not exist.',
      })
    }

    const members = await ProjectMembership.find({
      project_id: projectId,
    }).populate('user_id', 'f_name l_name username')

    res.json(members)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error.' })
  }
})

app.post('/projects/:projectId/members', async (req, res) => {
  try {
    const { projectId } = req.params
    const { user_id } = req.body

    if (
      !mongoose.isValidObjectId(projectId) ||
      !mongoose.isValidObjectId(user_id)
    ) {
      return res.status(400).json({
        message: 'Invalid project or user ID.',
      })
    }

    const project = await Project.findById(projectId)

    if (!project) {
      return res.status(404).json({
        message: 'Project does not exist.',
      })
    }

    const user = await User.findById(user_id)

    if (!user) {
      return res.status(404).json({
        message: 'User does not exist.',
      })
    }

    const existingMember = await ProjectMembership.findOne({
      project_id: projectId,
      user_id,
    })

    if (existingMember) {
      return res.status(400).json({
        message: 'User is already a member of this project.',
      })
    }

    await ProjectMembership.create({
      project_id: projectId,
      user_id,
    })

    res.status(201).json({
      message: 'Member added successfully.',
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'User is already a member of this project.',
      })
    }

    console.error(error)
    res.status(500).json({ message: 'Server error.' })
  }
})

app.delete('/projects/:projectId/members/:userId', async (req, res) => {
  try {
    const { projectId, userId } = req.params

    if (
      !mongoose.isValidObjectId(projectId) ||
      !mongoose.isValidObjectId(userId)
    ) {
      return res.status(400).json({
        message: 'Invalid project or user ID.',
      })
    }

    const project = await Project.findById(projectId)

    if (!project) {
      return res.status(404).json({
        message: 'Project does not exist.',
      })
    }

    const user = await User.findById(userId)

    if (!user) {
      return res.status(404).json({
        message: 'User does not exist.',
      })
    }

    if (project.project_lead_id.toString() === userId) {
      return res.status(400).json({
        message: 'The project lead cannot be removed.',
      })
    }

    const assignedStory = await UserStory.exists({ project_id: projectId, assigned_user_id: userId })
    if (assignedStory) {
      return res.status(400).json({ message: 'Member has assigned stories. Reassign, unassign, or delete those stories first.' })
    }

    const membership = await ProjectMembership.findOneAndDelete({
      project_id: projectId,
      user_id: userId,
    })

    if (!membership) {
      return res.status(404).json({
        message: 'User is not a member of this project.',
      })
    }

    res.json({
      message: 'Member removed successfully.',
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error.' })
  }
})

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB')

    app.listen(5050, () => {
      console.log('Server running on port 5050')
    })
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error)
  })
