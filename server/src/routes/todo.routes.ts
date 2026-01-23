import { Router } from 'express';
import { 
  createTodo, 
  getMyTodos, 
  updateTodo, 
  shareTodoByEmail, 
  generateInviteLink,
  acceptInvite,
  deleteTodo 
} from '../controllers/todo.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);


router.post('/', createTodo);
router.get('/', getMyTodos);
router.patch('/:id', updateTodo);
router.delete('/:id', deleteTodo);    


router.post('/share', shareTodoByEmail); 


router.post('/:id/invite', generateInviteLink);


router.post('/join/:token', acceptInvite);

export default router;