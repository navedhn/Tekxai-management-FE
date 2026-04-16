import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Tabs from '@/components/ui/Tabs';
import { ChevronRight, Star, MessageSquare, GripVertical, MoreVertical } from '@/assets/icons';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, Trash2 } from 'lucide-react';
import Loader from '@/components/ui/Loader';
import { useGetStarredQueries, useUnstarItemMutation, type StarredItem } from '@/services/starredService';

interface CommentEntry {
    type: 'comment';
    id: string;
    author: string;
    avatar: string;
    date: string;
    mention: string;
    content: string;
}

interface ProjectEntry {
    type: 'project';
    id: string;
    author: string;
    avatar: string;
    date: string;
    projects: {
        id: string;
        name: string;
        progress: number;
        completed: number;
        total: number;
        comments: number;
        assigneeAvatar: string;
    }[];
}

interface TaskEntry {
    type: 'task';
    id: string;
    author: string;
    avatar: string;
    date: string;
    tasks: {
        id: string;
        name: string;
        progress: number;
        completed: number;
        total: number;
    }[];
}

type StarredEntry = CommentEntry | ProjectEntry | TaskEntry;

const MOCK_COMMENTS: CommentEntry[] = [
    {
        type: 'comment',
        id: 'c1',
        author: 'Abdul Rehman',
        avatar: 'https://i.pravatar.cc/150?u=rehman',
        date: 'March 12 11:06 pm',
        mention: '@alihamza',
        content: 'Cron job of creating video daily on basis of active ads and replace previous one',
    },
    {
        type: 'comment',
        id: 'c2',
        author: 'Ali Murtaza',
        avatar: 'https://i.pravatar.cc/150?u=murtaza',
        date: 'March 12 11:06 pm',
        mention: '@alihamza',
        content: 'One additional screen to add: format selector, after brand guide. This will display each of our primary design formats as options. I\'ll provide you an example of each of our primary format types so you can enter that into your design.',
    },
    {
        type: 'comment',
        id: 'c3',
        author: 'Ali Murtaza',
        avatar: 'https://i.pravatar.cc/150?u=murtaza2',
        date: 'March 12 11:06 pm',
        mention: '@alihamza',
        content: 'One additional screen to add: format selector, after brand guide. This will display each of our primary design formats as options. I\'ll provide you an example of each of our primary format types so you can enter that into your design.',
    }
];

const MOCK_PROJECTS: ProjectEntry[] = [
    {
        type: 'project',
        id: 'p1',
        author: 'Abdul Rehman',
        avatar: 'https://i.pravatar.cc/150?u=rehman',
        date: 'March 12 11:06 pm',
        projects: [
            { id: '1', name: 'Database Redesign', progress: 30, completed: 5, total: 20, comments: 7, assigneeAvatar: 'https://i.pravatar.cc/150?u=assignee1' },
            { id: '2', name: 'Setup Locations & Devices', progress: 45, completed: 5, total: 20, comments: 7, assigneeAvatar: 'https://i.pravatar.cc/150?u=assignee2' },
        ]
    },
    {
        type: 'project',
        id: 'p2',
        author: 'Abdul Rehman',
        avatar: 'https://i.pravatar.cc/150?u=rehman',
        date: 'March 12 11:06 pm',
        projects: [
            { id: '3', name: 'Database Redesign', progress: 30, completed: 5, total: 20, comments: 7, assigneeAvatar: 'https://i.pravatar.cc/150?u=assignee1' },
            { id: '4', name: 'Setup Locations & Devices', progress: 45, completed: 5, total: 20, comments: 7, assigneeAvatar: 'https://i.pravatar.cc/150?u=assignee2' },
        ]
    }
];

const MOCK_TASKS: TaskEntry[] = [
    {
        type: 'task',
        id: 't1',
        author: 'Abdul Rehman',
        avatar: 'https://i.pravatar.cc/150?u=rehman',
        date: 'March 12 11:06 pm',
        tasks: [
            { id: '1', name: 'Backend Stuff (User Journey)', progress: 40, completed: 3, total: 7 },
        ]
    },
    {
        type: 'task',
        id: 't2',
        author: 'Abdul Rehman',
        avatar: 'https://i.pravatar.cc/150?u=rehman',
        date: 'March 12 11:06 pm',
        tasks: [
            { id: '2', name: 'Backend Stuff (User Journey)', progress: 40, completed: 3, total: 7 },
        ]
    },
    {
        type: 'task',
        id: 't3',
        author: 'Abdul Rehman',
        avatar: 'https://i.pravatar.cc/150?u=rehman',
        date: 'March 12 11:06 pm',
        tasks: [
            { id: '3', name: 'Backend Stuff (User Journey)', progress: 40, completed: 3, total: 7 },
        ]
    }
];

const StarredQueries: React.FC = () => {
    const [activeTab, setActiveTab] = useState('Comments');
    const { data: rawStarredData, isLoading } = useGetStarredQueries({ tab: activeTab.toLowerCase() });

    const unstarMutation = useUnstarItemMutation();
    const handleUnstar = async (type: string, id: string) => {
        try {
            await unstarMutation.mutateAsync({ item_type: type, id });
        } catch (e) {
            console.error('Failed to unstar', e);
        }
    };

    // Support either direct array return or object mapped arrays
    const listData = Array.isArray(rawStarredData)
        ? rawStarredData
        : (rawStarredData?.[activeTab.toLowerCase()] || []);

    const tabs = [
        { label: 'Comments', value: 'Comments', count: 16 },
        { label: 'Projects', value: 'Projects', count: 16 },
        { label: 'Tasks', value: 'Tasks', count: 16 }
    ];

    const renderComments = () => (
        <div className="flex flex-col gap-6">
            {isLoading ? <Loader /> : listData.length === 0 ?
                <div className="text-gray-400 font-bold text-sm flex bg-white rounded-xl items-center justify-center min-h-[300px]">No starred comments found.</div>
                : listData.map((query: any) => (
                    <div key={query.id} className="group flex items-center gap-6">
                        <Card className="flex-1 p-6 flex flex-col gap-4 shadow-sm border-gray-100/50 hover:shadow-md transition-shadow relative overflow-hidden rounded-[2rem]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <img src={query.avatar} alt={query.author} className="h-10 w-10 rounded-full object-cover border-2 border-primary-50" />
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-black text-gray-900 leading-none">{query.author}</span>
                                        <span className="text-[11px] text-gray-400 font-bold leading-none mt-0.5">{query.date}</span>
                                        <button onClick={() => handleUnstar('comments', query.id)} className="ml-1 hover:scale-110 active:scale-95 transition-all">
                                            <Star size={16} className="text-yellow-400 fill-yellow-400" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 pl-14">
                                <Badge variant="info" className="w-fit bg-primary-50 text-primary-600 border-none px-3 py-1 font-black text-[11px]">
                                    {query.mention}
                                </Badge>
                                <p className="text-sm text-gray-600 leading-relaxed font-medium">
                                    {query.content}
                                </p>
                            </div>
                        </Card>

                        <button className="h-14 w-14 shrink-0 rounded-[1.2rem] bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-400 hover:text-primary-500 hover:border-primary-200 hover:shadow-md transition-all active:scale-95 group-hover:bg-primary-50/30">
                            <ChevronRight size={24} />
                        </button>
                    </div>
                ))}
        </div>
    );

    const renderProjects = () => (
        <div className="flex flex-col gap-6">
            {isLoading ? <Loader /> : listData.length === 0 ? <div className="text-gray-400 font-bold text-sm flex bg-white rounded-xl items-center justify-center min-h-[300px]">No starred projects found.</div> : listData.map((entry: any) => (
                <div key={entry.id} className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <img src={entry.avatar} alt={entry.author} className="h-6 w-6 rounded-full border border-gray-100" />
                        <span className="text-xs font-black text-gray-900">{entry.author}</span>
                        <span className="text-[10px] text-gray-400 font-bold">{entry.date}</span>
                        <button onClick={() => handleUnstar('projects', entry.id)} className="hover:scale-110 active:scale-95 transition-all">
                            <Star size={14} className="text-yellow-400 fill-yellow-400" />
                        </button>
                    </div>

                    <div className="flex flex-col  border-l-2 border-primary-50 bg-white">
                        {entry.projects.map((proj: StarredItem, index: number) => (
                            <motion.div
                                key={proj.id}
                                className={`flex items-center justify-between py-2 group overflow-hidden 
        ${index !== entry.projects.length - 1 ? "border-b border-gray-200" : ""}`}
                                initial="rest"
                                whileHover="hover"
                                animate="rest"
                            >
                                {/* LEFT ICON (SPACE RESERVED) */}
                                <motion.div
                                    variants={{
                                        rest: { width: 0, opacity: 0 },
                                        hover: { width: 30, opacity: 1 },
                                    }}
                                    transition={{ duration: 0.3 }}
                                    className="flex justify-center"
                                >
                                    <Folder size={16} className="text-primary-500" />
                                </motion.div>

                                {/* MAIN CONTENT */}
                                <div className="flex items-center justify-between flex-1 px-2 py-1">

                                    {/* LEFT TEXT */}
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm font-black text-gray-900 w-6">
                                            {proj.id}.
                                        </span>
                                        <span className="text-sm font-bold text-gray-700 min-w-[200px]">
                                            {proj.name}
                                        </span>
                                    </div>

                                    {/* RIGHT CONTENT */}
                                    <div className="flex items-center gap-6">

                                        {/* PROGRESS */}
                                        <div className="flex items-center gap-3 w-48">
                                            <div className="h-2 flex-1 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary-500 rounded-full"
                                                    style={{ width: `${proj.progress}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* INFO */}
                                        <div className="flex items-center gap-4 text-[11px] font-bold text-gray-400">
                                            <span>
                                                Completed {proj.completed} out of {proj.total} hr
                                            </span>

                                            <div className="flex items-center gap-1.5 hover:text-primary-500 transition-colors cursor-pointer">
                                                <MessageSquare size={14} />
                                                <span>{proj.comments}</span>
                                            </div>

                                            <img
                                                src={proj.assigneeAvatar}
                                                className="h-6 w-6 rounded-full border border-white shadow-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT ACTIONS (SPACE RESERVED) */}
                                <motion.div
                                    variants={{
                                        rest: { width: 0, opacity: 0 },
                                        hover: { width: 60, opacity: 1 },
                                    }}
                                    transition={{ duration: 0.3 }}
                                    className="flex items-center gap-2 justify-end"
                                >
                                    <button className="p-1 rounded-full hover:bg-red-50 hover:text-red-600 transition text-red-500">
                                        <Trash2 size={14} />
                                    </button>
                                    <button onClick={() => handleUnstar('projects', proj.id)} className="p-1 rounded-full hover:bg-gray-100 transition">
                                        <Star size={14} className="text-yellow-400 fill-yellow-400" />
                                    </button>
                                </motion.div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );

    const renderTasks = () => (
        <div className="flex flex-col gap-8">
            {isLoading ? <Loader /> : listData.length === 0 ? <div className="text-gray-400 font-bold text-sm flex bg-white rounded-xl items-center justify-center min-h-[300px]">No starred tasks found.</div> : listData.map((entry: any) => (
                <div key={entry.id} className="flex flex-col gap-4 ">
                    <div className="flex items-center gap-3">
                        <img src={entry.avatar} alt={entry.author} className="h-6 w-6 rounded-full border border-gray-100" />
                        <span className="text-xs font-black text-gray-900">{entry.author}</span>
                        <span className="text-[10px] text-gray-400 font-bold">{entry.date}</span>
                        <button onClick={() => handleUnstar('tasks', entry.id)} className="hover:scale-110 active:scale-95 transition-all">
                            <Star size={14} className="text-yellow-400 fill-yellow-400" />
                        </button>
                    </div>

                    <div className="flex flex-col gap-3 border-l-2 border-primary-50">
                        {entry.tasks.map((task: StarredItem) => (
                            <div key={task.id} className="flex bg-white items-center justify-between pl-3 border-l-4 border-gray-200 py-3  rounded-r-xl transition-colors group">
                                <div className="flex items-center gap-3">
                                    <GripVertical size={16} className="text-gray-300 " />
                                    <span className="text-sm font-bold text-gray-700">{task.name}</span>
                                </div>

                                <div className="flex items-center gap-8">
                                    <div className="flex items-center gap-3 w-48">
                                        <div className="h-2 flex-1 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${task.progress}%` }} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-[11px] font-bold text-gray-400">Completed: {task.completed} out of {task.total}</span>
                                        <button className="p-2 ">
                                            <MoreVertical size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-20">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Starred Queries</h1>

            <Tabs
                options={tabs}
                value={activeTab}
                onChange={setActiveTab}
            />

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'Comments' && renderComments()}
                    {activeTab === 'Projects' && renderProjects()}
                    {activeTab === 'Tasks' && renderTasks()}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default StarredQueries;
