import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema({
  authorId: {
    // type: mongoose.Schema.Types.ObjectId,
    type: String,
    ref: 'User',
    required: true,
  },
  title: { type: String, required: true, trim: true },
  content: { type: String, default: '' },
  status: { type: String, enum: ['notDone', 'workingOn', 'done'] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  duration: { type: Number, required: true, min: 0 },
});

const Task = mongoose.model('Task', TaskSchema);

export default Task;