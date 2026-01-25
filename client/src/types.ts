export interface Todo {
  id: number; 
  title: string;
  description?: string;
  isCompleted: boolean;
  isRepeatable: boolean;
  repeatDays?: string;
  remindAt?: string;
  ownerId: number;
  owner: { fullName: string; email: string };
}