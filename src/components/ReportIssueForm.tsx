import React, { useState } from 'react';
import { Camera, MapPin, Sparkles, AlertCircle, RefreshCw, Send, Trash, Copy } from 'lucide-react';
import { CommunityIssue, IssueCategory, IssuePriority } from '../types';

interface ReportIssueFormProps {
  userCoords: { lat: number; lng: number; address: string } | null;
  currentIssues: CommunityIssue[];
  onSubmit: (issue: Omit<CommunityIssue, 'id' | 'votes' | 'votedBy' | 'verifiedBy' | 'timeline'>) => Promise<void>;
  onCancel: () => void;
  currentUser: string;
}

export default function ReportIssueForm({
  userCoords,
  currentIssues,
  onSubmit,
  onCancel,
  currentUser
}: ReportIssueFormProps) {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IssueCategory>('Other');
  const [priority, setPriority] = useState<IssuePriority>('Medium');
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [image, setImage] = useState<string | null>(null); // Base64 string for preview & Gemini
  const [imageName, setImageName] = useState<string | null>(null);
  
  // AI assist states
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiActionPlan, setAiActionPlan] = useState<string | null>(null);
  const [aiAssisted, setAiAssisted] = useState(false);
  const [priorityRationale, setPriorityRationale] = useState<string | null>(null);
  const [assignedDepartment, setAssignedDepartment] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Set address from props if provided
  React.useEffect(() => {
    if (userCoords) {
      setAddress(userCoords.address);
    }
  }, [userCoords]);

  const categories: IssueCategory[] = [
    'Roads & Traffic',
    'Water & Sanitation',
    'Waste Management',
    'Electricity & Lighting',
    'Public Parks & Safety',
    'Other'
  ];

  const getDefaultDepartment = (cat: IssueCategory): string => {
    switch (cat) {
      case 'Roads & Traffic': return 'Public Works';
      case 'Water & Sanitation': return 'Utilities';
      case 'Waste Management': return 'Sanitation & Waste Management';
      case 'Electricity & Lighting': return 'Utilities';
      case 'Public Parks & Safety': return 'Parks and Recreation';
      default: return 'Public Works';
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        // Auto-trigger AI assist on image upload
        if (description || title || file) {
            handleAiAssist(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setImageName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        if (description || title || file) {
            handleAiAssist(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{ isDuplicate: boolean, duplicateId: string | null, message: string | null } | null>(null);

  async function handleAiAssist(imageString?: string | React.MouseEvent | React.FormEvent) {
    const isEvent = imageString && typeof imageString === 'object' && 'preventDefault' in imageString;
    const actualImageString = isEvent ? undefined : (imageString as string);
    const imageToUse = actualImageString || image;
    
    // Allow analysis with just image, even if description is empty
    if (!description.trim() && !imageToUse) {
      setErrorMsg('Please describe the issue or upload a photo first so the AI can analyze it.');
      return;
    }
    setErrorMsg(null);
    setIsAiAnalyzing(true);
    setAiAssisted(false);
    setPriorityRationale(null);
    setAssignedDepartment(null);

    try {
      const response = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: description.trim() || "Analyze this image and guess the community issue.",
          image: imageToUse
        })
      });

      const data = await response.json();
      if (data) {
        setCategory(data.category as IssueCategory);
        setPriority(data.priority as IssuePriority);
        setTitle(data.polishedTitle || '');
        setAiActionPlan(data.actionPlan || '');
        setPriorityRationale(data.priorityRationale || null);
        setAssignedDepartment(data.assignedDepartment || null);
        setAiAssisted(true);
      }
    } catch (err) {
      console.error('Error calling AI assist:', err);
      setErrorMsg('AI categorization failed. You can still file the report manually.');
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handleDuplicateCheckAndSubmit = async (forceSubmit: boolean = false) => {
    if (!description.trim() || !address.trim() || !title.trim()) {
      setErrorMsg('Please ensure Title, Description, and Address coordinates are completed.');
      return;
    }

    const lat = userCoords?.lat || 28.6139;
    const lng = userCoords?.lng || 77.2090;

    setIsSubmitting(true);

    if (!forceSubmit && currentIssues.length > 0) {
      try {
        const response = await fetch('/api/ai/check-duplicate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: description.trim(),
            latitude: lat,
            longitude: lng,
            currentIssues
          })
        });
        const data = await response.json();
        if (data.isDuplicate) {
          setDuplicateWarning(data);
          setIsSubmitting(false);
          return;
        }
      } catch (err) {
        console.error('Error checking duplicate:', err);
      }
    }

    const resolvedDepartment = assignedDepartment || getDefaultDepartment(category);
    const resolvedRationale = priorityRationale || `Assessed based on municipal parameters for category: ${category}`;

    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      status: 'Reported',
      latitude: lat,
      longitude: lng,
      address: address.trim(),
      imageUrl: image || undefined,
      reportedBy: currentUser,
      reportedAt: new Date().toISOString(),
      aiActionPlan: aiActionPlan || undefined,
      priorityRationale: resolvedRationale,
      assignedDepartment: resolvedDepartment
    });
    
    setIsSubmitting(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleDuplicateCheckAndSubmit(false);
  };

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-sm p-6 space-y-6 animate-fade-in" id="new-issue-form-card">
      <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
        <h2 className="font-sans font-black text-slate-800 flex items-center gap-2 text-lg uppercase tracking-tight">
          <Camera className="h-5 w-5 text-blue-600" />
          Report Local Incident
        </h2>
        <button
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-rose-500 font-bold uppercase tracking-wider cursor-pointer"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 font-sans text-sm text-slate-700">
        
        {/* Coordinate details notification */}
        <div className="flex items-start gap-3 p-4 bg-blue-50/30 border-2 border-blue-100/30 rounded-2xl">
          <MapPin className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">Report Location Set</span>
            <p className="text-xs text-slate-700 font-bold font-mono">
              {userCoords ? userCoords.address : 'Default Center District (Click map to change)'}
            </p>
          </div>
        </div>

        {/* 1. Drag & Drop File Upload */}
        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">Image upload (Drag & drop or Click)</label>
          {image ? (
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-200 flex items-center justify-center max-h-48 group shadow-inner">
              <img
                src={image}
                alt="Uploaded community hazard preview"
                className="w-full object-cover max-h-48"
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                onClick={() => {
                  setImage(null);
                  setImageName(null);
                }}
                className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow-lg cursor-pointer"
              >
                <Trash className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/10 p-6 rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 text-center group"
            >
              <Camera className="h-8 w-8 text-slate-400 group-hover:text-blue-600 transition-colors" />
              <div className="text-xs text-slate-500 font-bold">
                <label className="text-blue-600 hover:text-blue-700 font-black cursor-pointer">
                  <span>Upload a photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
                {' '}or drag it here
              </div>
              <p className="text-[10px] text-slate-400 font-semibold">Supports PNG, JPG up to 5MB</p>
            </div>
          )}
        </div>

        {/* 2. Issue Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">Describe the community concern</label>
          <textarea
            placeholder="Describe what is broken, its exact location, and why it presents a hazard to the neighborhood..."
            className="w-full border-2 border-slate-100 focus:border-blue-400 rounded-2xl p-3.5 focus:outline-none h-24 text-xs font-semibold resize-none"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (e.target.value && !title) {
                // Auto placeholder title
                setTitle(e.target.value.slice(0, 30) + '...');
              }
            }}
            required
          />
        </div>

        {/* 3. AI Assist Sparkle Button */}
        <div className="flex justify-between items-center bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border-2 border-indigo-100/30 p-4 rounded-2xl gap-2">
          <div className="space-y-0.5">
            <span className="text-xs font-black uppercase tracking-wider text-purple-700 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-purple-600" />
              AI Automated Categorizer
            </span>
            <p className="text-[10px] text-slate-500 font-semibold leading-normal">
              Analyze text & image with Gemini to auto-fill category, priority, & action plan
            </p>
          </div>
          <button
            type="button"
            onClick={handleAiAssist}
            disabled={isAiAnalyzing || (!description.trim() && !image)}
            className="flex items-center gap-1.5 text-xs py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold uppercase tracking-wider rounded-full shadow-md shadow-purple-200 transition-all cursor-pointer disabled:opacity-50"
          >
            {isAiAnalyzing ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 fill-white" />
                <span>AI Assist</span>
              </>
            )}
          </button>
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-600 font-bold flex items-center gap-1 font-sans bg-rose-50 border border-rose-100 p-2.5 rounded-xl">
            <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
            {errorMsg}
          </p>
        )}

        {/* 4. Categorization Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
              Issue Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as IssueCategory)}
              className="w-full text-xs bg-white border-2 border-slate-100 rounded-xl p-2.5 focus:outline-none focus:border-blue-400 font-bold cursor-pointer"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
              Severity Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full text-xs bg-white border-2 border-slate-100 rounded-xl p-2.5 focus:outline-none focus:border-blue-400 font-bold cursor-pointer"
            >
              <option value="Low">Low Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="High">High Priority</option>
              <option value="Critical">Critical Emergency</option>
            </select>
          </div>
        </div>

        {/* 5. Title & Specific Address */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Polished Title
            </label>
            <input
              type="text"
              placeholder="e.g. Broken Water Pipe near Sidewalk"
              className="w-full text-xs bg-white border-2 border-slate-100 rounded-xl p-2.5 focus:outline-none focus:border-blue-400 font-semibold"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Landmark Description
            </label>
            <input
              type="text"
              placeholder="e.g. 124 Elm St (Corner near gates)"
              className="w-full text-xs bg-white border-2 border-slate-100 rounded-xl p-2.5 focus:outline-none focus:border-blue-400 font-semibold"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>
        </div>

        {/* AI Risk & Assignment Results */}
        {(priorityRationale || assignedDepartment) && (
          <div className="p-4 bg-purple-50/40 border-2 border-purple-100/30 rounded-2xl space-y-2.5 animate-fade-in">
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-700 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-purple-600 animate-pulse" />
              AI Automated Risk & Assignment Analysis
            </span>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-purple-100/50">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Assigned Department</span>
                <span className="font-bold text-slate-700">{assignedDepartment || getDefaultDepartment(category)}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-purple-100/50">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">AI Priority Assessment</span>
                <span className="font-bold text-purple-700">{priority} Priority</span>
              </div>
            </div>
            {priorityRationale && (
              <div className="bg-white p-3 rounded-xl border border-purple-100/50 text-[11px]">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">AI Severity Rationale</span>
                <p className="text-slate-600 font-semibold leading-relaxed">{priorityRationale}</p>
              </div>
            )}
          </div>
        )}

        {duplicateWarning && (
          <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-2xl space-y-3 animate-fade-in">
            <div className="flex gap-2 text-orange-800">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div>
                <span className="text-sm font-black uppercase tracking-wider block mb-1">Potential Duplicate Detected</span>
                <p className="text-xs font-semibold">{duplicateWarning.message}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDuplicateCheckAndSubmit(true)}
                className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Submit Anyway
              </button>
              <button
                type="button"
                onClick={() => setDuplicateWarning(null)}
                className="flex-1 py-2 bg-white text-orange-600 border-2 border-orange-200 hover:bg-orange-100 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Review Issue
              </button>
            </div>
          </div>
        )}

        {/* Action button submit */}
        {!duplicateWarning && (
          <div className="pt-3 flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-black uppercase tracking-wider shadow-md shadow-blue-200 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              <span>{isSubmitting ? 'Checking & Publishing...' : 'Publish Community Report'}</span>
            </button>
          </div>
        )}

      </form>
    </div>
  );
}
