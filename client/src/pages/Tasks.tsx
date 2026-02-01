import { useState } from "react";
import { Layout } from "@/components/ui/Layout";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/use-tasks";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, GripVertical, Trash2, Calendar, Clock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const formSchema = insertTaskSchema.extend({
  dueDate: z.string().optional(),
});

export default function Tasks() {
  const { data: tasks, isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Group tasks by status
  const columns = {
    todo: tasks?.filter(t => t.status === 'todo') || [],
    in_progress: tasks?.filter(t => t.status === 'in_progress') || [],
    done: tasks?.filter(t => t.status === 'done') || [],
  };

  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData("taskId", id.toString());
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const taskId = Number(e.dataTransfer.getData("taskId"));
    updateTask.mutate({ id: taskId, status });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <Layout>
      <div className="flex flex-col gap-8 h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Mission Control</h1>
            <p className="text-muted-foreground mt-2">Manage daily operations and strategic goals.</p>
          </div>
          <AddTaskDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full overflow-hidden pb-4">
          <TaskColumn 
            title="To Do" 
            tasks={columns.todo} 
            status="todo" 
            color="bg-slate-500/10 border-slate-500/20"
            headerColor="text-slate-400"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragStart={handleDragStart}
            onDelete={(id) => deleteTask.mutate(id)}
          />
          <TaskColumn 
            title="In Progress" 
            tasks={columns.in_progress} 
            status="in_progress"
            color="bg-blue-500/10 border-blue-500/20"
            headerColor="text-blue-400"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragStart={handleDragStart}
            onDelete={(id) => deleteTask.mutate(id)}
          />
          <TaskColumn 
            title="Done" 
            tasks={columns.done} 
            status="done"
            color="bg-emerald-500/10 border-emerald-500/20"
            headerColor="text-emerald-400"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragStart={handleDragStart}
            onDelete={(id) => deleteTask.mutate(id)}
          />
        </div>
      </div>
    </Layout>
  );
}

function TaskColumn({ title, tasks, status, color, headerColor, onDrop, onDragOver, onDragStart, onDelete }: any) {
  return (
    <div 
      className={`flex flex-col h-full rounded-2xl border ${color} bg-card/30 backdrop-blur-sm transition-colors`}
      onDrop={(e) => onDrop(e, status)}
      onDragOver={onDragOver}
    >
      <div className={`p-4 font-semibold tracking-wide flex justify-between items-center ${headerColor}`}>
        <span>{title}</span>
        <span className="bg-white/5 px-2 py-0.5 rounded text-xs">{tasks.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tasks.map((task: any) => (
          <div
            key={task.id}
            draggable
            onDragStart={(e) => onDragStart(e, task.id)}
            className="group relative bg-card border border-white/5 rounded-xl p-4 shadow-lg hover:shadow-xl hover:border-primary/50 cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5"
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium text-white text-sm">{task.title}</h4>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-opacity"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            
            {task.description && (
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
            )}

            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              {task.dueDate && (
                <div className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded">
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(task.dueDate), 'MMM d')}</span>
                </div>
              )}
              <div className="flex items-center gap-1 ml-auto">
                <Clock className="h-3 w-3" />
                <span>{format(new Date(task.createdAt), 'MMM d')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddTaskDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const createTask = useCreateTask();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      dueDate: new Date().toISOString().split('T')[0]
    }
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createTask.mutate(data, {
      onSuccess: () => {
        toast({ title: "Task Created", description: "Let's get to work!" });
        onOpenChange(false);
        form.reset();
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to create task.", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25">
          <Plus className="mr-2 h-4 w-4" /> Add Task
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-white/10 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input className="bg-black/20 border-white/10" {...form.register("title")} placeholder="What needs to be done?" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea className="bg-black/20 border-white/10" {...form.register("description")} placeholder="Add details..." />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Due Date</label>
            <Input type="date" className="bg-black/20 border-white/10" {...form.register("dueDate")} />
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={createTask.isPending} className="bg-primary hover:bg-primary/90 w-full">
              {createTask.isPending ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
