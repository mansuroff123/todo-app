import { Router } from 'express';
import { 
  createTodo, 
  getMyTodos, 
  updateTodoStatus, 
  shareTodo, 
  deleteTodo 
} from '../controllers/todo.controller.js';
import { protect } from 'src/middleware/auth.middleware.js';

const router = Router();

router.use(protect); // Barcha todo yo'nalishlari uchun tokenni majburiy qilish

router.post('/', createTodo);
router.get('/', getMyTodos);
router.patch('/:id', updateTodoStatus);
router.post('/share', shareTodo);
router.delete('/:id', deleteTodo);

export default router;