import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Check, Leaf, Plus, Sprout, X } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

type Task = {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
};
type Filter = 'all' | 'active' | 'completed';
const STORAGE_KEY = 'little-by-little.tasks.v1';
const queryClient = new QueryClient();

function readTasks(): Task[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((task): task is Task =>
      typeof task?.id === 'string' &&
      typeof task?.text === 'string' &&
      typeof task?.completed === 'boolean' &&
      typeof task?.createdAt === 'number'
    );
  } catch {
    return [];
  }
}

function Home() {
  const [tasks, setTasks] = useState<Task[]>(readTasks);
  const [filter, setFilter] = useState<Filter>('all');
  const [draft, setDraft] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // The app remains usable in private browsing modes that block storage.
    }
  }, [tasks]);

  const activeCount = useMemo(() => tasks.filter((task) => !task.completed).length, [tasks]);
  const completedCount = tasks.length - activeCount;
  const visibleTasks = useMemo(() => tasks.filter((task) => {
    if (filter === 'active') return !task.completed;
    if (filter === 'completed') return task.completed;
    return true;
  }), [tasks, filter]);

  const addTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setTasks((current) => [{ id, text, completed: false, createdAt: Date.now() }, ...current]);
    setDraft('');
  };
  const toggleTask = (id: string) => {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, completed: !task.completed } : task));
  };
  const deleteTask = (id: string) => setTasks((current) => current.filter((task) => task.id !== id));
  const clearCompleted = () => setTasks((current) => current.filter((task) => !task.completed));

  const date = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    .format(new Date());
  const emptyTitle = filter === 'completed'
    ? 'Nothing finished just yet'
    : filter === 'active'
      ? 'A little breathing room'
      : 'A fresh page';
  const emptyCopy = filter === 'completed'
    ? 'As you finish things, they’ll find a home here.'
    : filter === 'active'
      ? 'You’ve tended to everything on your list. Take a moment to enjoy that.'
      : 'Start with one small thing you’d like to make space for today.';

  return (
    <main className="app-shell" data-testid="page-tasks">
      <div className="page-wrap">
        <header className="topline">
          <div className="brand" data-testid="text-app-name">
            <span className="brand-mark" aria-hidden="true"><Sprout size={17} strokeWidth={1.8} /></span>
            <span>little by little</span>
          </div>
          <span className="top-note">A softer way to stay on track</span>
        </header>

        <section className="hero" aria-labelledby="page-heading">
          <div className="eyebrow"><span className="eyebrow-dot" /> A moment for what matters</div>
          <h1 id="page-heading">Make room for<br /><em>what’s next.</em></h1>
          <p className="hero-copy">A small list for the things on your mind. No rush, no perfect plan — just one step at a time.</p>
          <div className="date-label" data-testid="text-today-date">{date}</div>
        </section>

        <section className="task-panel" aria-label="Your task list" data-testid="panel-task-list">
          <form className="composer" onSubmit={addTask} data-testid="form-add-task">
            <span className="compose-plus" aria-hidden="true"><Plus size={17} /></span>
            <label className="sr-only" htmlFor="new-task">Add a task</label>
            <input
              id="new-task"
              className="task-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="What would you like to get done?"
              autoComplete="off"
              maxLength={180}
              data-testid="input-new-task"
            />
            <button className="add-button" type="submit" disabled={!draft.trim()} data-testid="button-add-task">Add task</button>
          </form>

          <div className="task-toolbar">
            <div className="filter-group" role="group" aria-label="Filter tasks" data-testid="group-task-filters">
              {(['all', 'active', 'completed'] as const).map((item) => (
                <button
                  type="button"
                  key={item}
                  className="filter-button"
                  aria-pressed={filter === item}
                  onClick={() => setFilter(item)}
                  data-testid={`button-filter-${item}`}
                >
                  {item[0].toUpperCase() + item.slice(1)}
                </button>
              ))}
            </div>
            <span className="task-count" aria-live="polite" data-testid="text-task-count">
              {activeCount} {activeCount === 1 ? 'thing' : 'things'} left
            </span>
          </div>

          {visibleTasks.length > 0 ? (
            <ul className="task-list" aria-label={`${filter} tasks`} data-testid="list-tasks">
              {visibleTasks.map((task) => (
                <li className="task-row" key={task.id} data-testid={`row-task-${task.id}`}>
                  <button
                    type="button"
                    className={`task-check${task.completed ? ' is-complete' : ''}`}
                    aria-label={task.completed ? `Mark ${task.text} active` : `Mark ${task.text} complete`}
                    aria-pressed={task.completed}
                    onClick={() => toggleTask(task.id)}
                    data-testid={`button-toggle-task-${task.id}`}
                  >
                    {task.completed && <Check size={13} strokeWidth={2.6} />}
                  </button>
                  <span className={`task-text${task.completed ? ' is-complete' : ''}`} data-testid={`text-task-${task.id}`}>
                    {task.text}
                  </span>
                  <button
                    type="button"
                    className="delete-button"
                    aria-label={`Delete ${task.text}`}
                    onClick={() => deleteTask(task.id)}
                    data-testid={`button-delete-task-${task.id}`}
                  >
                    <X size={16} strokeWidth={1.8} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state" role="status" data-testid={`empty-state-${filter}`}>
              <div className="empty-art" aria-hidden="true"><Leaf size={25} strokeWidth={1.45} /></div>
              <h2 className="empty-title" data-testid="text-empty-title">{emptyTitle}</h2>
              <p className="empty-copy" data-testid="text-empty-message">{emptyCopy}</p>
            </div>
          )}

          <footer className="bottom-bar">
            <span className="bottom-hint" data-testid="text-completed-count">
              {completedCount > 0
                ? `${completedCount} ${completedCount === 1 ? 'small win' : 'small wins'} today`
                : 'Small steps still count'}
            </span>
            <button
              type="button"
              className="clear-button"
              disabled={completedCount === 0}
              onClick={clearCompleted}
              data-testid="button-clear-completed"
            >
              Clear completed
            </button>
          </footer>
        </section>

        <p className="footer-note" data-testid="text-footer-note">
          <Leaf size={13} strokeWidth={1.7} aria-hidden="true" />
          Progress, at your own pace.
        </p>
      </div>
    </main>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
