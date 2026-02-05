import { useState } from "react";
import { Layout } from "@/components/ui/Layout";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/use-tasks";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Calendar, Clock, Tag, Flag, X, Edit, Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const formSchema = insertTaskSchema.extend({
  dueDate: z.string().optional(),
});

const COLUMNS = [
  { id: "open", title: "Open", color: "bg-slate-500/10 border-slate-500/20", headerColor: "text-slate-600 dark:text-slate-400" },
  { id: "planned", title: "Planned", color: "bg-amber-500/10 border-amber-500/20", headerColor: "text-amber-600 dark:text-amber-400" },
  { id: "in_progress", title: "In Progress", color: "bg-blue-500/10 border-blue-500/20", headerColor: "text-blue-600 dark:text-blue-400" },
  { id: "done", title: "Done", color: "bg-emerald-500/10 border-emerald-500/20", headerColor: "text-emerald-600 dark:text-emerald-400" },
];

const PRIORITIES = [
  { value: "low", label: "Low", color: "bg-gray-500/20 text-gray-600 dark:text-gray-400" },
  { value: "medium", label: "Medium", color: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400" },
  { value: "high", label: "High", color: "bg-red-500/20 text-red-600 dark:text-red-400" },
];

const LABELS = ["Product", "Marketing", "Ops", "Finance", "Tech"];

export default function Tasks() {
  const { data: tasks, isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [draggedTask, setDraggedTask] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const getTasksByStatus = (status: string) => tasks?.filter(t => t.status === status) || [];

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedTask(id);
    e.dataTransfer.setData("taskId", id.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const taskId = Number(e.dataTransfer.getData("taskId"));
    if (taskId) {
      updateTask.mutate({ id: taskId, status });
    }
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6 h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mission Control</h1>
            <p className="text-muted-foreground mt-2">Manage daily operations and strategic goals.</p>
          </div>
          <AddTaskDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full overflow-hidden pb-4">
          {COLUMNS.map(column => (
            <TaskColumn
              key={column.id}
              title={column.title}
              tasks={getTasksByStatus(column.id)}
              status={column.id}
              color={column.color}
              headerColor={column.headerColor}
              isDropTarget={dragOverColumn === column.id}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDelete={(id) => deleteTask.mutate(id)}
              onTaskClick={setSelectedTask}
              draggedTask={draggedTask}
            />
          ))}
        </div>
      </div>

      <TaskDetailDialog
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onDelete={(id) => {
          deleteTask.mutate(id);
          setSelectedTask(null);
        }}
      />
    </Layout>
  );
}

function TaskColumn({ 
  title, tasks, status, color, headerColor, isDropTarget,
  onDrop, onDragOver, onDragLeave, onDragStart, onDragEnd, onDelete, onTaskClick, draggedTask
}: any) {
  return (
    <div 
      className={`flex flex-col h-full rounded-xl border ${color} bg-card/30 backdrop-blur-sm transition-all ${
        isDropTarget ? 'ring-2 ring-primary/50 border-primary/50' : ''
      }`}
      onDrop={(e) => onDrop(e, status)}
      onDragOver={(e) => onDragOver(e, status)}
      onDragLeave={onDragLeave}
    >
      <div className={`p-3 font-semibold tracking-wide flex justify-between items-center ${headerColor} border-b border-border/50`}>
        <span className="text-sm">{title}</span>
        <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tasks.map((task: any) => (
          <TaskCard
            key={task.id}
            task={task}
            isDragging={draggedTask === task.id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDelete={onDelete}
            onClick={() => onTaskClick(task)}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-xs">
            No tasks
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task, isDragging, onDragStart, onDragEnd, onDelete, onClick }: any) {
  const priorityColor = PRIORITIES.find(p => p.value === task.priority)?.color || PRIORITIES[1].color;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`group relative bg-card border border-border rounded-lg p-3 shadow-sm cursor-pointer transition-all ${
        isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5'
      }`}
      data-testid={`task-card-${task.id}`}
    >
      <div className="flex justify-between items-start gap-2 mb-2">
        <h4 className="font-medium text-foreground text-sm leading-tight">{task.title}</h4>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity flex-shrink-0"
          data-testid={`button-delete-task-${task.id}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      
      {task.description && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {task.priority && (
          <Badge className={`text-[10px] px-1.5 py-0 ${priorityColor}`}>
            {task.priority}
          </Badge>
        )}
        {task.labels && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            <Tag className="h-2.5 w-2.5 mr-1" />
            {task.labels}
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2">
        {task.dueDate && (
          <div className="flex items-center gap-1">
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
  );
}

function TaskDetailDialog({ task, onClose, onDelete }: { task: any; onClose: () => void; onDelete: (id: number) => void }) {
  const { toast } = useToast();
  const updateTask = useUpdateTask();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedStatus, setEditedStatus] = useState("");
  const [editedPriority, setEditedPriority] = useState("");
  const [editedLabels, setEditedLabels] = useState("");

  if (!task) return null;

  const handleEdit = () => {
    setEditedTitle(task.title);
    setEditedDescription(task.description || "");
    setEditedStatus(task.status);
    setEditedPriority(task.priority || "medium");
    setEditedLabels(task.labels || "");
    setIsEditing(true);
  };

  const handleSave = () => {
    updateTask.mutate({
      id: task.id,
      title: editedTitle,
      description: editedDescription,
      status: editedStatus,
      priority: editedPriority,
      labels: editedLabels,
    }, {
      onSuccess: () => {
        toast({ title: "Task Updated" });
        setIsEditing(false);
        onClose();
      }
    });
  };

  const priorityInfo = PRIORITIES.find(p => p.value === task.priority) || PRIORITIES[1];

  return (
    <Dialog open={!!task} onOpenChange={() => onClose()}>
      <DialogContent className="bg-card border-border sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            {isEditing ? (
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="text-lg font-semibold bg-background border-border"
                data-testid="input-edit-task-title"
              />
            ) : (
              <DialogTitle className="text-xl">{task.title}</DialogTitle>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Description</label>
            {isEditing ? (
              <Textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                className="bg-background border-border resize-none min-h-[100px]"
                placeholder="Add a description..."
                data-testid="input-edit-task-description"
              />
            ) : (
              <p className="text-sm text-foreground">{task.description || "No description"}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              {isEditing ? (
                <Select value={editedStatus} onValueChange={setEditedStatus}>
                  <SelectTrigger className="bg-background border-border" data-testid="select-edit-task-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {COLUMNS.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={COLUMNS.find(c => c.id === task.status)?.color}>{task.status}</Badge>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Priority</label>
              {isEditing ? (
                <Select value={editedPriority} onValueChange={setEditedPriority}>
                  <SelectTrigger className="bg-background border-border" data-testid="select-edit-task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {PRIORITIES.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={priorityInfo.color}>{priorityInfo.label}</Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Label</label>
            {isEditing ? (
              <Select value={editedLabels} onValueChange={setEditedLabels}>
                <SelectTrigger className="bg-background border-border" data-testid="select-edit-task-label">
                  <SelectValue placeholder="Select label" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {LABELS.map(l => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              task.labels ? <Badge variant="outline"><Tag className="h-3 w-3 mr-1" />{task.labels}</Badge> : <span className="text-sm text-muted-foreground">None</span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-4 border-t border-border">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Created: {format(new Date(task.createdAt), 'MMM d, yyyy')}
            </div>
            {task.dueDate && (
              <div className="flex items-center gap-1">
                <Flag className="h-3 w-3" />
                Due: {format(new Date(task.dueDate), 'MMM d, yyyy')}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)} data-testid="button-cancel-edit">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateTask.isPending} data-testid="button-save-task">
                <Check className="h-4 w-4 mr-1" /> Save
              </Button>
            </>
          ) : (
            <>
              <Button variant="destructive" onClick={() => onDelete(task.id)} data-testid="button-delete-task-detail">
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
              <Button onClick={handleEdit} data-testid="button-edit-task">
                <Edit className="h-4 w-4 mr-1" /> Edit
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
      status: "open",
      priority: "medium",
      labels: "",
      dueDate: "",
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
        <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25" data-testid="button-add-task">
          <Plus className="mr-2 h-4 w-4" /> Add Task
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title *</label>
            <Input className="bg-background border-border" {...form.register("title")} placeholder="What needs to be done?" data-testid="input-task-title" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea className="bg-background border-border resize-none" {...form.register("description")} placeholder="Add details..." data-testid="input-task-description" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select onValueChange={(val) => form.setValue("priority", val)} defaultValue="medium">
                <SelectTrigger className="bg-background border-border" data-testid="select-task-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {PRIORITIES.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Label</label>
              <Select onValueChange={(val) => form.setValue("labels", val)}>
                <SelectTrigger className="bg-background border-border" data-testid="select-task-label">
                  <SelectValue placeholder="Select label" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {LABELS.map(l => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Due Date</label>
            <Input type="date" className="bg-background border-border" {...form.register("dueDate")} data-testid="input-task-due-date" />
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={createTask.isPending} className="bg-primary hover:bg-primary/90 w-full" data-testid="button-submit-task">
              {createTask.isPending ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
