'use client';

import { useState, useRef, useEffect } from 'react';
import { LogOut, Upload, Image, Video, Palette, Armchair, Leaf, Bookmark, Plus, ArrowUpRight, Home, ArrowLeft, CheckCircle, AlertCircle, ShoppingCart, Save, Trash2, Calendar, ChevronDown, UserRound, Settings, Sparkles, ArrowRight, Box, Clock3 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { apiUrl, formatApiError } from '@/lib/api';
import Analyze2DFloorPlan from '../../components/Analyze2DFloorPlan';
import DesignLoadingAnimation from '../../components/DesignLoadingAnimation';
import { supabase } from '../../lib/supabase/client';

// Translations
const translations = {
  english: {
    // Sidebar
    wallPainting: 'Wall Painting',
    furniture: 'Furniture Design',
    plantsDecor: 'Plants & Decor',
    savedDesigns: 'Saved Designs',
    smartHouse: 'Smart House Analysis',
    logout: 'Logout',
    
    // Form labels
    selectImage: 'Select Image',
    uploadVideo: 'Upload Video',
    analyzeWithAI: 'Analyze with AI',
    imagePreview: 'Image Preview',
    newDesign: 'New Design',
    recentDesigns: 'Recent Designs',
    saveDesign: 'Save Design',
    clear: 'Clear',
    delete: 'Delete',
    back: 'Back',
    
    // Smart House form
    totalFamilyMembers: 'Total Family Members',
    adults: 'Adults',
    children: 'Children',
    seniorCitizens: 'Senior Citizens',
    plotSize: 'Plot Size (sq ft)',
    numberOfFloors: 'Number of Floors',
    budget: 'Budget (₹)',
    analyzeHouse: 'Analyze House',
    
    // Results
    recommendations: 'Recommendations',
    savedDesignsGallery: 'Saved Designs',
    viewingDesign: 'Viewing Design',
    noDesigns: 'No designs yet',
    
    // Messages
    selectImageMessage: 'Select an image to get started',
    analyzingImage: 'Analyzing Image...',
    analyzingHouse: 'Analyzing Your Home...',
    savingDesign: 'Saving...',
    designSaved: 'Design saved successfully!',
    error: 'Error',
    success: 'Success',
    
    // Language
    language: 'Language',
    english: 'English',
    bengali: 'Bengali',
  },
  bengali: {
    // Sidebar
    wallPainting: 'দেওয়াল রঙ',
    furniture: 'আসবাবপত্র ডিজাইন',
    plantsDecor: 'গাছ এবং সাজসজ্জা',
    savedDesigns: 'সংরক্ষিত ডিজাইন',
    smartHouse: 'স্মার্ট বাড়ি বিশ্লেষণ',
    logout: 'লগআউট',
    
    // Form labels
    selectImage: 'ছবি নির্বাচন করুন',
    uploadVideo: 'ভিডিও আপলোড করুন',
    analyzeWithAI: 'এআই দিয়ে বিশ্লেষণ করুন',
    imagePreview: 'ছবির পূর্বরূপ',
    newDesign: 'নতুন ডিজাইন',
    recentDesigns: 'সম্প্রতি ডিজাইন',
    saveDesign: 'ডিজাইন সংরক্ষণ করুন',
    clear: 'পরিষ্কার করুন',
    delete: 'মুছে ফেলুন',
    back: 'পিছনে',
    
    // Smart House form
    totalFamilyMembers: 'মোট পরিবারের সদস্য',
    adults: 'প্রাপ্তবয়স্ক',
    children: 'শিশু',
    seniorCitizens: 'প্রবীণ নাগরিক',
    plotSize: 'প্লট সাইজ (বর্গফুট)',
    numberOfFloors: 'তলার সংখ্যা',
    budget: 'বাজেট (₹)',
    analyzeHouse: 'বাড়ি বিশ্লেষণ করুন',
    
    // Results
    recommendations: 'সুপারিশ',
    savedDesignsGallery: 'সংরক্ষিত ডিজাইন',
    viewingDesign: 'ডিজাইন দেখছেন',
    noDesigns: 'এখনও কোন ডিজাইন নেই',
    
    // Messages
    selectImageMessage: 'শুরু করতে একটি ছবি নির্বাচন করুন',
    analyzingImage: 'ছবি বিশ্লেষণ করছে...',
    analyzingHouse: 'আপনার বাড়ি বিশ্লেষণ করছি...',
    savingDesign: 'সংরক্ষণ করছে...',
    designSaved: 'ডিজাইন সফলভাবে সংরক্ষিত হয়েছে!',
    error: 'ত্রুটি',
    success: 'সাফল্য',
    
    // Language
    language: 'ভাষা',
    english: 'ইংরেজি',
    bengali: 'বাংলা',
  },
};

type Language = 'english' | 'bengali';

interface SavedDesign {
  id: string;
  imageBase64: string;
  analysisData: any;
  category: string;
  savedDate: string;
  fileName: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('english');
  const t = translations[language];
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDashboardHome, setIsDashboardHome] = useState(true);
  const [activeSection, setActiveSection] = useState('wall-painting');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedImagePath, setUploadedImagePath] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationSuccess, setGenerationSuccess] = useState(false);
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
  const [viewingDesign, setViewingDesign] = useState<SavedDesign | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [totalFamilyMembers, setTotalFamilyMembers] = useState<number>(4);
  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(2);
  const [seniorCitizens, setSeniorCitizens] = useState<number>(0);
  const [plotSize, setPlotSize] = useState<string>('2000');
  const [numberOfFloors, setNumberOfFloors] = useState<number>(2);
  const [budget, setBudget] = useState<string>('500000');
  const [isAnalyzingHouse, setIsAnalyzingHouse] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState<{ name: string; email: string } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null);
  const toolHistoryDepthRef = useRef(0);
  const pendingHistoryBackRef = useRef(false);

  // Load saved designs and language from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('savedDesigns');
    if (stored) {
      try {
        setSavedDesigns(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to load saved designs:', error);
      }
    }

    const savedLanguage = localStorage.getItem('preferredLanguage') as Language | null;
    if (savedLanguage && (savedLanguage === 'english' || savedLanguage === 'bengali')) {
      setLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    const syncToolFromUrl = () => {
      const tool = new URLSearchParams(window.location.search).get('tool');
      if (tool) {
        setIsDashboardHome(false);
        setActiveSection(tool);
        setViewingDesign(null);
      } else {
        setIsDashboardHome(true);
        setViewingDesign(null);
      }
    };

    syncToolFromUrl();
    const handlePopState = () => {
      if (pendingHistoryBackRef.current) {
        pendingHistoryBackRef.current = false;
      } else if (toolHistoryDepthRef.current > 0) {
        toolHistoryDepthRef.current -= 1;
      }
      syncToolFromUrl();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!supabase) {
      router.replace('/login');
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) {
        const user = data.session.user;
        setAuthUser({
          name: (user.user_metadata?.full_name as string | undefined)?.trim() || user.email?.split('@')[0] || 'Designer',
          email: user.email || '',
        });
        setAuthReady(true);
      }
      else router.replace('/login');
    });

    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAuthUser({
          name: (session.user.user_metadata?.full_name as string | undefined)?.trim() || session.user.email?.split('@')[0] || 'Designer',
          email: session.user.email || '',
        });
        setAuthReady(true);
      }
      else router.replace('/login');
    });

    return () => {
      mounted = false;
      authSubscription.subscription.unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    await supabase?.auth.signOut();
    localStorage.removeItem('user');
    router.replace('/login');
  };

  // Save design to localStorage
  const handleSaveDesign = () => {
    if (!analysisData || !uploadedImage) return;

    setIsSaving(true);
    try {
      const newDesign: SavedDesign = {
        id: Date.now().toString(),
        imageBase64: uploadedImage,
        analysisData: analysisData,
        category: activeSection,
        savedDate: new Date().toLocaleString(),
        fileName: uploadedFileName || 'Design',
      };

      // Keep max 6 designs per category
      const sameCategory = savedDesigns.filter(d => d.category === activeSection);
      const otherCategories = savedDesigns.filter(d => d.category !== activeSection);
      const updated = [newDesign, ...sameCategory].slice(0, 6);
      const finalDesigns = [...updated, ...otherCategories];
      
      setSavedDesigns(finalDesigns);
      localStorage.setItem('savedDesigns', JSON.stringify(finalDesigns));

      // Show success message
      setGenerationSuccess(true);
      setTimeout(() => setGenerationSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save design:', error);
      setGenerationError('Failed to save design');
      setTimeout(() => setGenerationError(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Load saved design for viewing
  const handleViewSavedDesign = (design: SavedDesign) => {
    setViewingDesign(design);
    setActiveSection(design.category);
    setAnalysisData(design.analysisData);
    setUploadedImage(design.imageBase64);
    setUploadedFileName(design.fileName);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Delete saved design
  const handleDeleteDesign = (id: string) => {
    const updated = savedDesigns.filter(d => d.id !== id);
    setSavedDesigns(updated);
    localStorage.setItem('savedDesigns', JSON.stringify(updated));
    
    if (viewingDesign?.id === id) {
      setViewingDesign(null);
      setAnalysisData(null);
    }
  };

  const prepareImageFile = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setUploadError('Please upload a JPG, JPEG, PNG, or WEBP image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB.');
      return;
    }

    fileRef.current = file;
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageDataUrl = event.target?.result as string;
      setUploadedImage(imageDataUrl);
      setUploadedFileName(file.name);
      setUploadSuccess(false);
      setUploadError(null);
      setAnalysisData(null);
      setGenerationError(null);
    };
    reader.onerror = () => setUploadError('Unable to read this image. Please try another file.');
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) prepareImageFile(file);
  };

  const handleImageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) prepareImageFile(file);
  };

  const clearUploadedImage = () => {
    setUploadedImage(null);
    setUploadedFileName(null);
    setUploadedImagePath(null);
    setUploadSuccess(false);
    setUploadError(null);
    setAnalysisData(null);
    setGenerationError(null);
    setGenerationSuccess(false);
    fileRef.current = null;
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleAnalyzeWithAI = async () => {
    if (!fileRef.current) {
      setUploadError('No file selected');
      return;
    }

    let generationStarted = false;
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    setGenerationError(null);
    setGenerationSuccess(false);

    try {
      // Step 1: Upload image to backend
      console.log('Step 1: Uploading image...');
      const formData = new FormData();
      formData.append('file', fileRef.current);
      formData.append('section', activeSection);
      formData.append('language', language);

      const uploadResponse = await axios.post(
        apiUrl('/upload-image'),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setUploadSuccess(true);
      const uploadedPath = `uploads/${uploadResponse.data.filename}`;
      setUploadedImagePath(uploadedPath);
      console.log('Image uploaded:', uploadedPath);

      // Step 2: Analyze room using AI
      console.log('Step 2: Analyzing room with AI...');
      setIsUploading(false);
      setIsGenerating(true);
      generationStarted = true;

      let generateResponse;
      
      // Use furniture-specific endpoint for furniture section
      if (activeSection === 'furniture') {
        console.log('Calling furniture design endpoint...');
        const generateFormData = new FormData();
        generateFormData.append('image_path', uploadedPath);

        generateResponse = await axios.post(
          apiUrl('/generate-furniture-design'),
          generateFormData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
      } else if (activeSection === 'plants-decor') {
        // Use plants-decor-specific endpoint
        console.log('Calling plants & decor endpoint...');
        const generateFormData = new FormData();
        generateFormData.append('image_path', uploadedPath);
        generateFormData.append('language', language);

        generateResponse = await axios.post(
          apiUrl('/generate-plants-decor'),
          generateFormData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
      } else {
        // Use general endpoint for wall-painting and other sections
        console.log('Calling general design endpoint...');
        const generateFormData = new FormData();
        generateFormData.append('image_path', uploadedPath);
        generateFormData.append('section', activeSection);
        generateFormData.append('language', language);

        generateResponse = await axios.post(
          apiUrl('/generate-design'),
          generateFormData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
      }

      setGenerationSuccess(true);
      setAnalysisData(generateResponse.data.analysis);
      console.log('Analysis completed:', generateResponse.data.analysis);

      // Auto-hide success message after 4 seconds
      setTimeout(() => {
        setGenerationSuccess(false);
      }, 4000);
    } catch (error: any) {
      const errorMessage = formatApiError(error, 'Failed to process request');
      
      if (generationStarted) {
        setGenerationError(errorMessage);
        setTimeout(() => {
          setGenerationError(null);
        }, 5000);
      } else {
        setUploadError(errorMessage);
        setTimeout(() => {
          setUploadError(null);
        }, 5000);
      }
      console.error('Error:', error);
    } finally {
      setIsUploading(false);
      setIsGenerating(false);
    }
  };

  const sections = [
    {
      id: 'wall-painting',
      title: 'AI Wall Painting',
      icon: Palette,
      color: 'from-purple-500 to-purple-600',
      description: 'Transform your walls with AI-powered color and pattern suggestions',
    },
    {
      id: 'furniture',
      title: 'AI Furniture Design',
      icon: Armchair,
      color: 'from-blue-500 to-blue-600',
      description: 'Get intelligent furniture placement and design recommendations',
    },
    {
      id: 'plants-decor',
      title: 'AI Plants & Decor',
      icon: Leaf,
      color: 'from-green-500 to-green-600',
      description: 'Add life to your spaces with AI-suggested plants and decorations',
    },
    {
      id: 'saved-designs',
      title: 'Saved Designs',
      icon: Bookmark,
      color: 'from-pink-500 to-pink-600',
      description: 'View and manage all your saved design projects',
    },
    {
      id: 'smart-house-analysis',
      title: 'Smart House Analysis',
      icon: Home,
      color: 'from-indigo-500 to-indigo-600',
      description: 'Get a comprehensive analysis of your entire home with AI-powered insights',
    },
  ];

  const activeSecData = sections.find((s) => s.id === activeSection) ?? {
    id: 'analyze-2d-floor-plan',
    title: 'Analyze 2D Floor Plan',
    icon: Home,
    color: 'from-slate-500 to-slate-600',
    description: 'Describe your floors, rooms, walls, doors, and windows',
  };
  const isFloorPlanSection = activeSection === 'analyze-2d-floor-plan';
  const displayName = authUser?.name || 'Designer';
  const initials = displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const showcaseSections = sections.filter((section) => ['wall-painting', 'furniture', 'plants-decor', 'smart-house-analysis'].includes(section.id));
  const openTool = (sectionId: string) => {
    setIsDashboardHome(false);
    setActiveSection(sectionId);
    setViewingDesign(null);
    toolHistoryDepthRef.current += 1;
    window.history.pushState(
      { designAI: 'tool', tool: sectionId },
      '',
      `/dashboard?tool=${encodeURIComponent(sectionId)}`,
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleBackNavigation = () => {
    if (toolHistoryDepthRef.current > 0) {
      toolHistoryDepthRef.current -= 1;
      pendingHistoryBackRef.current = true;
      window.history.back();
    } else {
      router.replace('/dashboard');
    }
  };
  const goToDashboardHome = () => {
    toolHistoryDepthRef.current = 0;
    setIsDashboardHome(true);
    setViewingDesign(null);
    setAnalysisData(null);
    router.replace('/dashboard');
  };

  if (!authReady) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-500">Checking your session...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f5f3ff]">
      {/* Sidebar */}
      {activeSection === '__sidebar_disabled__' && <div
        className={`fixed left-0 top-0 h-full bg-white shadow-lg transition-all duration-300 z-40 ${
          isSidebarOpen ? 'w-64' : 'w-0'
        } overflow-hidden`}
      >
        <div className="p-6 border-b border-violet-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold text-white">🎨</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">DesignAI</span>
          </div>
        </div>
        <nav className="p-4 space-y-2">
          {sections.map((section) => {
            const Icon = section.icon;
            return <button key={section.id} onClick={() => openTool(section.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeSection === section.id ? 'bg-gradient-to-r from-violet-100 to-blue-100 text-violet-700 font-semibold border-l-4 border-violet-600' : 'text-gray-700 hover:bg-violet-50'}`}><Icon className="w-5 h-5" /><span>{section.title}</span></button>;
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-violet-100 bg-violet-50/80"><button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition font-medium"><LogOut className="w-5 h-5" /><span>Logout</span></button></div>
      </div>}

      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${
          activeSection === '__sidebar_disabled__' && isSidebarOpen ? 'ml-64' : 'ml-0'
        }`}
      >
        {/* Top Header */}
        <div className="bg-white/90 shadow-sm border-b border-violet-100 sticky top-0 z-30 backdrop-blur-xl">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              {isDashboardHome ? (
                <div className="w-10" />
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleBackNavigation}
                    className="rounded-lg p-2 text-violet-600 transition hover:bg-violet-50"
                    title="Go back"
                    aria-label="Go back to the previous page"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={goToDashboardHome}
                    className="rounded-lg p-2 text-violet-600 transition hover:bg-violet-50"
                    title="Dashboard home"
                    aria-label="Go to DesignAI dashboard"
                  >
                    <Home className="h-5 w-5" />
                  </button>
                  <span className="px-2 text-lg font-bold bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">DesignAI</span>
                </div>
              )}
              {isDashboardHome ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">Welcome back</p>
                  <h1 className="text-2xl font-bold text-gray-900">Your Design Studio</h1>
                </div>
              ) : viewingDesign && activeSection === 'saved-designs' ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setViewingDesign(null);
                      setAnalysisData(null);
                      clearUploadedImage();
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition text-blue-600"
                    title="Back to saved designs"
                  >
                    <ArrowUpRight className="w-5 h-5 rotate-180" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{viewingDesign.fileName}</h1>
                    <p className="text-sm text-gray-500">Saved on {new Date(viewingDesign.savedDate).toLocaleDateString()}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">Design workspace</p>
                  <h1 className="text-2xl font-bold text-gray-900">{activeSecData?.title}</h1>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <button onClick={() => setProfileOpen((open) => !open)} className="flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 p-1.5 pr-3 hover:bg-violet-100" aria-expanded={profileOpen}>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-blue-500 text-sm font-bold text-white">{initials}</span>
                  <span className="hidden max-w-[120px] truncate text-sm font-semibold text-slate-700 sm:block">{displayName}</span>
                  <ChevronDown className="h-4 w-4 text-violet-600" />
                </button>
                {profileOpen ? (
                  <div className="absolute right-0 top-14 z-50 w-72 overflow-hidden rounded-2xl border border-violet-100 bg-white p-2 shadow-2xl shadow-violet-900/15">
                    <div className="rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 p-4 text-white">
                      <p className="font-bold">{displayName}</p>
                      <p className="mt-1 truncate text-xs text-violet-100">{authUser?.email}</p>
                    </div>
                    <button onClick={() => router.push('/profile')} className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-violet-50"><UserRound className="h-4 w-4 text-violet-600" /> Profile</button>
                    <button onClick={() => router.push('/settings')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-violet-50"><Settings className="h-4 w-4 text-violet-600" /> Settings</button>
                    <button onClick={() => { openTool('saved-designs'); setProfileOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-violet-50"><Bookmark className="h-4 w-4 text-violet-600" /> Saved Designs</button>
                    <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl border-t border-slate-100 px-3 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" /> Logout</button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-8">
          {isDashboardHome && (
            <div className="mb-10 space-y-8">
              <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#34146e] via-[#5635bd] to-[#1676cf] p-7 text-white shadow-2xl shadow-violet-900/25 sm:p-10">
                <img src="/assets/hero-interior.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen" />
                <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-fuchsia-400/30 blur-3xl" />
                <div className="relative max-w-2xl">
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-violet-100"><Sparkles className="h-3.5 w-3.5" /> AI interior studio</div>
                  <h2 className="max-w-xl text-3xl font-bold leading-tight sm:text-5xl">Turn your space into a place you love to live in.</h2>
                  <p className="mt-4 max-w-xl text-base leading-7 text-violet-100">Upload a room photo and let DesignAI shape the colors, furniture, and details around your lifestyle.</p>
                </div>
                <div className="relative mt-9 grid max-w-xl grid-cols-3 gap-3 border-t border-white/20 pt-5 text-sm text-violet-100">
                  <span><b className="block text-xl text-white">4</b>AI design tools</span><span><b className="block text-xl text-white">2D → 3D</b>Floor planning</span><span><b className="block text-xl text-white">∞</b>Possibilities</span>
                </div>
              </section>

              <div className="flex items-end justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-500">Explore your toolkit</p><h2 className="mt-1 text-2xl font-bold text-slate-900">Design every layer of your home</h2></div><span className="hidden text-sm text-slate-500 sm:block">Choose a starting point</span></div>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {showcaseSections.map((section) => {
                  const Icon = section.icon;
                  const image = section.id === 'wall-painting' ? '/assets/tool-wall.jpg' : section.id === 'furniture' ? '/assets/tool-furniture.jpg' : section.id === 'plants-decor' ? '/assets/tool-plants.jpg' : '/assets/tool-analysis.jpg';
                  return <button key={section.id} onClick={() => openTool(section.id)} className="group relative min-h-[285px] overflow-hidden rounded-3xl bg-slate-900 text-left shadow-xl shadow-slate-900/10 transition hover:-translate-y-1 hover:shadow-2xl">
                    <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/35 to-transparent" />
                    <div className="relative flex h-full flex-col justify-end p-5 text-white"><span className="mb-auto grid h-11 w-11 place-items-center rounded-2xl bg-white/20 backdrop-blur-md"><Icon className="h-5 w-5" /></span><h3 className="text-xl font-bold">{section.title}</h3><p className="mt-1 text-sm leading-5 text-white/75">{section.description}</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-white">Open tool <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></div>
                  </button>;
                })}
              </div>
              <button onClick={() => openTool('analyze-2d-floor-plan')} className="group relative flex min-h-[190px] w-full overflow-hidden rounded-3xl bg-slate-950 text-left shadow-xl shadow-blue-900/15 transition hover:-translate-y-1">
                <img src="/assets/house-3d.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-60 transition duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent" />
                <div className="relative flex max-w-xl flex-col justify-center p-7 text-white sm:p-9"><span className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300"><Box className="h-4 w-4" /> Spatial intelligence</span><h3 className="text-2xl font-bold sm:text-3xl">Transform 2D Floor Plan into 3D House</h3><p className="mt-2 text-sm text-slate-300">Sketch your rooms, then explore the home in an interactive 3D view.</p><span className="mt-5 inline-flex w-fit items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950">Open floor-plan studio <ArrowRight className="h-4 w-4" /></span></div>
              </button>
              <section className="rounded-3xl border border-violet-100 bg-white/80 p-6 shadow-lg shadow-violet-900/5 sm:p-7">
                <div className="mb-5 flex items-center justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-500">Your workspace</p><h2 className="mt-1 text-2xl font-bold text-slate-900">Recent Designs</h2></div><button onClick={() => openTool('saved-designs')} className="text-sm font-bold text-violet-700 hover:underline">View all</button></div>
                {savedDesigns.length > 0 ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{savedDesigns.slice(0, 4).map((design) => <button key={design.id} onClick={() => { openTool('saved-designs'); handleViewSavedDesign(design); }} className="group overflow-hidden rounded-2xl border border-slate-100 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><img src={design.imageBase64} alt={design.fileName} className="aspect-[4/3] w-full object-cover transition group-hover:scale-105" /><span className="block p-3"><b className="block truncate text-sm text-slate-900">{design.fileName}</b><span className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Clock3 className="h-3 w-3" />{new Date(design.savedDate).toLocaleDateString()}</span></span></button>)}</div> : <div className="rounded-2xl bg-gradient-to-r from-violet-50 to-blue-50 p-6 text-center"><Bookmark className="mx-auto h-8 w-8 text-violet-400" /><p className="mt-2 font-semibold text-slate-800">Your design gallery is ready</p><p className="mt-1 text-sm text-slate-500">Upload a room photo inside the Wall Painting tool to create your first saved design.</p><button onClick={() => openTool('wall-painting')} className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700">Open Wall Painting</button></div>}
              </section>
            </div>
          )}
          {/* Smart House Analysis Page */}
          {activeSection === 'smart-house-analysis' && (
            <>
              {/* Section Description */}
              <div className="mb-8">
                <p className="text-gray-600 text-lg">{activeSecData?.description}</p>
              </div>

              {/* Smart House Analysis Content */}
              <div className="space-y-8">
                {/* Overview Card */}
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl p-8 border border-indigo-100">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <Home className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Comprehensive Home Analysis</h2>
                      <p className="text-gray-600">Analyze your entire home in one comprehensive report</p>
                    </div>
                  </div>
                  <p className="text-gray-700 leading-relaxed">
                    Upload photos of different rooms in your home and receive a detailed analysis combining wall painting suggestions, furniture recommendations, and plant & decor ideas for each space. Get a complete picture of how to transform your entire home.
                  </p>
                </div>

                {/* Smart House Form */}
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-8">Tell Us About Your Home</h3>
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Left Column */}
                    <div className="space-y-6">
                      {/* Total Family Members */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Total Family Members</label>
                        <input
                          type="number"
                          min="1"
                          value={totalFamilyMembers}
                          onChange={(e) => setTotalFamilyMembers(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">Total number of people in your household</p>
                      </div>

                      {/* Adults */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Adults</label>
                        <input
                          type="number"
                          min="0"
                          value={adults}
                          onChange={(e) => setAdults(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">Number of adults (18+)</p>
                      </div>

                      {/* Children */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Children</label>
                        <input
                          type="number"
                          min="0"
                          value={children}
                          onChange={(e) => setChildren(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">Number of children (under 18)</p>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                      {/* Senior Citizens */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Senior Citizens</label>
                        <input
                          type="number"
                          min="0"
                          value={seniorCitizens}
                          onChange={(e) => setSeniorCitizens(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">Number of senior citizens (65+)</p>
                      </div>

                      {/* Plot Size */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Plot Size (sq ft)</label>
                        <input
                          type="text"
                          value={plotSize}
                          onChange={(e) => setPlotSize(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">Total plot size in square feet</p>
                      </div>

                      {/* Number of Floors */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Number of Floors</label>
                        <select
                          value={numberOfFloors}
                          onChange={(e) => setNumberOfFloors(parseInt(e.target.value))}
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="1">1 Floor</option>
                          <option value="2">2 Floors</option>
                          <option value="3">3 Floors</option>
                          <option value="4">4 Floors</option>
                          <option value="5">5+ Floors</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Number of floors in your home</p>
                      </div>
                    </div>
                  </div>

                  {/* Budget */}
                  <div className="mt-6">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Budget (₹)</label>
                    <input
                      type="text"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Your budget for home renovation in Indian Rupees</p>
                  </div>

                  {/* Analyze House Button */}
                  {isAnalyzingHouse ? <div className="mt-8 rounded-2xl bg-gradient-to-br from-violet-50 to-blue-50"><DesignLoadingAnimation label={t.analyzingHouse} /></div> : <button
                    onClick={async () => {
                      setIsAnalyzingHouse(true);
                      try {
                        // Validate inputs
                        if (!plotSize || !budget) {
                          setGenerationError('Please fill in all fields');
                          setIsAnalyzingHouse(false);
                          return;
                        }

                        // Extract numeric values from formatted strings
                        const plotSizeNumeric = plotSize.replace(/[^0-9]/g, '');
                        const budgetNumeric = budget.replace(/[^0-9]/g, '');

                        if (!plotSizeNumeric || !budgetNumeric) {
                          setGenerationError('Plot size and budget must be numeric values');
                          setIsAnalyzingHouse(false);
                          return;
                        }

                        if (adults + children + seniorCitizens > totalFamilyMembers) {
                          setGenerationError('Adults, children, and senior citizens cannot exceed total family members');
                          setIsAnalyzingHouse(false);
                          return;
                        }

                        const formData = new FormData();
                        formData.append('family_members', totalFamilyMembers.toString());
                        formData.append('adults', adults.toString());
                        formData.append('children', children.toString());
                        formData.append('senior_citizens', seniorCitizens.toString());
                        formData.append('plot_size', plotSizeNumeric);
                        formData.append('floors', numberOfFloors.toString());
                        formData.append('budget', budgetNumeric);
                        formData.append('language', language);

                        const response = await axios.post(
                          apiUrl('/analyze-smart-house'),
                          formData
                        );

                        setAnalysisData(response.data.analysis);
                        setGenerationSuccess(true);
                        setTimeout(() => setGenerationSuccess(false), 4000);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      } catch (error: any) {
                        const errorMessage = formatApiError(error, 'Failed to analyze house');
                        setGenerationError(errorMessage);
                        setTimeout(() => setGenerationError(null), 5000);
                        console.error('Error:', error);
                      } finally {
                        setIsAnalyzingHouse(false);
                      }
                    }}
                    disabled={isAnalyzingHouse}
                    className="w-full mt-8 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    Analyze House
                  </button>}

                  <button
                    type="button"
                    onClick={() => openTool('analyze-2d-floor-plan')}
                    className="w-full mt-3 py-4 border border-indigo-200 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-50 transition flex items-center justify-center gap-2"
                  >
                    Analyze 2D Floor Plan
                  </button>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-3 gap-6 mt-8">
                  <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-purple-500 hover:shadow-xl transition">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                      <Palette className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Wall Analysis</h3>
                    <p className="text-gray-600 text-sm">AI-powered wall color and pattern suggestions tailored to your room's lighting and size</p>
                  </div>

                  <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500 hover:shadow-xl transition">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                      <Armchair className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Furniture Design</h3>
                    <p className="text-gray-600 text-sm">Smart furniture placement and selection recommendations for optimal space utilization</p>
                  </div>

                  <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500 hover:shadow-xl transition">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                      <Leaf className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Plants & Decor</h3>
                    <p className="text-gray-600 text-sm">Personalized plant and decorative item suggestions based on your room's environment</p>
                  </div>
                </div>

                {/* How It Works */}
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">How It Works</h3>
                  <div className="grid md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl mb-3 mx-auto">
                        1
                      </div>
                      <h4 className="font-bold text-gray-900 mb-2">Upload Photos</h4>
                      <p className="text-sm text-gray-600">Take photos of each room in your home</p>
                    </div>

                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl mb-3 mx-auto">
                        2
                      </div>
                      <h4 className="font-bold text-gray-900 mb-2">AI Analysis</h4>
                      <p className="text-sm text-gray-600">Our AI analyzes each room independently</p>
                    </div>

                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl mb-3 mx-auto">
                        3
                      </div>
                      <h4 className="font-bold text-gray-900 mb-2">Get Insights</h4>
                      <p className="text-sm text-gray-600">Receive detailed recommendations for each space</p>
                    </div>

                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl mb-3 mx-auto">
                        4
                      </div>
                      <h4 className="font-bold text-gray-900 mb-2">Save & Shop</h4>
                      <p className="text-sm text-gray-600">Save designs and shop for products</p>
                    </div>
                  </div>
                </div>

                {/* CTA Section */}
                <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-8 text-white">
                  <div className="max-w-2xl">
                    <h3 className="text-2xl font-bold mb-3">Ready to Transform Your Home?</h3>
                    <p className="text-indigo-100 mb-6">Start by analyzing your wall, furniture, or plants & decor in individual sections, then combine all recommendations for a complete home makeover plan.</p>
                    <div className="flex gap-4 flex-wrap">
                      <button
                        onClick={() => openTool('wall-painting')}
                        className="px-6 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:shadow-lg transition"
                      >
                        Analyze Wall
                      </button>
                      <button
                        onClick={() => openTool('furniture')}
                        className="px-6 py-3 bg-white/20 text-white border border-white rounded-lg font-semibold hover:bg-white/30 transition"
                      >
                        Analyze Furniture
                      </button>
                      <button
                        onClick={() => openTool('plants-decor')}
                        className="px-6 py-3 bg-white/20 text-white border border-white rounded-lg font-semibold hover:bg-white/30 transition"
                      >
                        Analyze Plants & Decor
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {!isDashboardHome && activeSection === 'analyze-2d-floor-plan' && <Analyze2DFloorPlan />}

          {/* Saved Designs Gallery - When viewing saved-designs tab */}
          {!isDashboardHome && activeSection === 'saved-designs' && !viewingDesign && (
            <>
              {/* Section Description */}
              <div className="mb-8">
                <p className="text-gray-600 text-lg">{activeSecData?.description}</p>
              </div>

              {/* Saved Designs Gallery */}
              {savedDesigns.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-bold text-gray-900">Your Designs</h2>
                    <span className="text-sm font-medium text-gray-600">{savedDesigns.length} designs saved</span>
                  </div>
                  <div className="grid md:grid-cols-3 gap-6">
                    {savedDesigns.map((design) => (
                      <div
                        key={design.id}
                        className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition overflow-hidden group"
                      >
                        <div className="aspect-video relative overflow-hidden bg-gray-100 cursor-pointer" onClick={() => {
                          setViewingDesign(design);
                          setAnalysisData(design.analysisData);
                          setUploadedImage(design.imageBase64);
                          setUploadedFileName(design.fileName);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}>
                          <img
                            src={design.imageBase64}
                            alt={design.fileName}
                            className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition flex flex-col items-center gap-2">
                              <ArrowUpRight className="w-10 h-10 text-white" />
                              <span className="text-white font-semibold">View Design</span>
                            </div>
                          </div>
                        </div>
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-bold text-gray-900 mb-2 truncate">{design.fileName}</h3>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                                <Calendar className="w-4 h-4 flex-shrink-0" />
                                <span>{new Date(design.savedDate).toLocaleDateString()}</span>
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full capitalize">
                                  {design.category === 'wall-painting' ? '🎨 Wall Paint' : design.category === 'furniture' ? '🪑 Furniture' : design.category === 'plants-decor' ? '🌿 Plants & Decor' : '🏠 Smart House Analysis'}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDesign(design.id);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0 ml-2"
                              title="Delete design"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                          <button
                            onClick={() => {
                              setViewingDesign(design);
                              setAnalysisData(design.analysisData);
                              setUploadedImage(design.imageBase64);
                              setUploadedFileName(design.fileName);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition"
                          >
                            View Full Design
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Bookmark className="w-12 h-12 text-gray-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">No Saved Designs Yet</h2>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    Create your first design by uploading an image and start transforming your space
                  </p>
                  <button
                    onClick={() => openTool('wall-painting')}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition font-semibold"
                  >
                    Create Design
                  </button>
                </div>
              )}
            </>
          )}

          {/* Section Description - For other sections */}
          {!isDashboardHome && activeSection !== 'saved-designs' && activeSection !== 'smart-house-analysis' && !isFloorPlanSection && (
            <div className="mb-8">
              <p className="text-gray-600 text-lg">{activeSecData?.description}</p>
            </div>
          )}

          {/* Colorful image workspace for the image-based AI tools */}
          {!isDashboardHome && activeSection !== 'saved-designs' && activeSection !== 'smart-house-analysis' && !isFloorPlanSection && (
          <div className="mb-12 grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleImageDrop}
              className="relative overflow-hidden rounded-[2rem] border border-violet-100 bg-white p-6 shadow-xl shadow-violet-900/10 sm:p-8"
            >
              <div className={`absolute right-0 top-0 h-40 w-40 rounded-full bg-gradient-to-br ${activeSecData?.color} opacity-15 blur-3xl`} />
              <div className="relative">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <span className={`mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${activeSecData?.color} text-white shadow-lg`}><Image className="h-6 w-6" /></span>
                    <h2 className="text-2xl font-bold text-slate-950">Bring your room into the studio</h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Drop a room photo here and let our AI create thoughtful {activeSecData?.title.toLowerCase()} ideas around it.</p>
                  </div>
                  <span className="hidden rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700 sm:block">AI powered</span>
                </div>
                <div className="rounded-3xl border-2 border-dashed border-violet-200 bg-gradient-to-br from-violet-50/80 via-white to-blue-50/80 p-5">
                  {uploadedImage ? (
                    <div className="grid gap-5 md:grid-cols-[180px_1fr] md:items-center">
                      <img src={uploadedImage} alt="Uploaded room preview" className="aspect-square w-full rounded-2xl object-cover shadow-lg" />
                      <div>
                        <p className="text-sm font-semibold text-emerald-700">Image ready for analysis</p>
                        <p className="mt-2 break-all text-sm font-medium text-slate-800">{uploadedFileName}</p>
                        <p className="mt-1 text-xs text-slate-500">You can replace it or generate recommendations when ready.</p>
                        <div className="mt-5 flex flex-wrap gap-3">
                          <button onClick={() => imageInputRef.current?.click()} className="rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-bold text-violet-700 hover:bg-violet-50">Replace image</button>
                          <button onClick={clearUploadedImage} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50">Remove image</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white text-violet-600 shadow-md"><Upload className="h-7 w-7" /></span>
                      <p className="mt-5 text-lg font-bold text-slate-900">Drag and drop your room image</p>
                      <p className="mt-1 text-sm text-slate-500">JPG, JPEG, PNG, or WEBP · up to 10MB</p>
                      <button onClick={() => imageInputRef.current?.click()} className={`mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r ${activeSecData?.color} px-5 py-3 text-sm font-bold text-white shadow-lg hover:-translate-y-0.5`}><Upload className="h-4 w-4" /> Choose Image</button>
                    </div>
                  )}
                  <input ref={imageInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="hidden" />
                </div>
                {uploadError ? <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{uploadError}</div> : null}
                {uploadedImage ? isGenerating ? (
                  <div className="mt-5 rounded-2xl bg-gradient-to-br from-violet-50 to-blue-50">
                    <DesignLoadingAnimation />
                  </div>
                ) : (
                  <button onClick={handleAnalyzeWithAI} disabled={isUploading} className={`mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${activeSecData?.color} font-bold text-white shadow-lg disabled:opacity-50`}>{isUploading ? <><span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> Uploading...</> : <><Sparkles className="h-4 w-4" /> Generate Design</>}</button>
                ) : null}
              </div>
            </div>
            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-violet-950 to-blue-900 p-6 text-white shadow-xl shadow-blue-900/15 sm:p-8">
              <img src={activeSection === 'furniture' ? '/assets/tool-furniture.jpg' : activeSection === 'plants-decor' ? '/assets/tool-plants.jpg' : '/assets/tool-wall.jpg'} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-screen" />
              <div className="relative flex h-full min-h-[250px] flex-col justify-between">
                <div><span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-violet-200"><Video className="mr-2 h-3.5 w-3.5" /> Video analysis</span><h3 className="mt-5 text-2xl font-bold">A richer walkthrough is coming.</h3><p className="mt-3 text-sm leading-6 text-slate-300">Video analysis is being tuned for accurate room-by-room recommendations.</p></div>
                <div><span className="inline-flex rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white">Coming Soon</span><p className="mt-3 text-xs text-slate-400">Video upload is currently disabled.</p></div>
              </div>
            </div>
          </div>
          )}

          {/* Smart House Analysis Results */}
          {analysisData && activeSection === 'smart-house-analysis' && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Smart House Analysis Results</h2>
                  <p className="text-sm text-gray-500 mt-1">Comprehensive home design recommendations</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveDesign}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save Design'}
                  </button>
                  <button
                    onClick={() => {
                      setAnalysisData(null);
                    }}
                    className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Analysis Success Message */}
              {generationSuccess && (
                <div className="flex items-center gap-2 mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-green-700">Smart house analysis completed successfully!</span>
                </div>
              )}

              {/* Analysis Error Message */}
              {generationError && (
                <div className="flex items-center gap-2 mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <span className="text-sm text-red-700">{generationError}</span>
                </div>
              )}

              {/* 1. House Style Recommendation */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl p-6 mb-6 border border-indigo-100">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Recommended House Style</h3>
                <p className="text-lg text-indigo-700 font-semibold">{analysisData.house_style_recommendation || 'Modern Design'}</p>
              </div>

              {/* 2. Room Counts */}
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-purple-500">
                  <div className="text-sm text-gray-600 mb-1">Bedrooms</div>
                  <div className="text-3xl font-bold text-purple-600">{analysisData.bedroom_count || 0}</div>
                </div>
                <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
                  <div className="text-sm text-gray-600 mb-1">Bathrooms</div>
                  <div className="text-3xl font-bold text-blue-600">{analysisData.bathroom_count || 0}</div>
                </div>
                <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
                  <div className="text-sm text-gray-600 mb-1">Balconies</div>
                  <div className="text-3xl font-bold text-green-600">{analysisData.balcony_count || 0}</div>
                </div>
              </div>

              {/* 3. Space Distribution */}
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border-l-4 border-indigo-500">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Vastu Recommendations</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-indigo-50 rounded-lg p-4">
                    <p className="text-sm font-semibold text-indigo-900 mb-2">🍳 Kitchen Placement</p>
                    <p className="text-sm text-indigo-700">{analysisData.kitchen_placement || 'South-East'}</p>
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-4">
                    <p className="text-sm font-semibold text-indigo-900 mb-2">🙏 Puja Room Placement</p>
                    <p className="text-sm text-indigo-700">{analysisData.puja_room_placement || 'North-East'}</p>
                  </div>
                </div>
              </div>

              {/* 4. Vastu Recommendations List */}
              {analysisData.vastu_recommendations && analysisData.vastu_recommendations.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border-l-4 border-yellow-500">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Key Vastu Principles</h3>
                  <ul className="space-y-3">
                    {analysisData.vastu_recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-yellow-700">{idx + 1}</span>
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed">{rec}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 5. House Layout - Room Recommendations */}
              {analysisData.room_recommendations && analysisData.room_recommendations.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border-l-4 border-green-500">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Recommended Room Layout</h3>
                  <div className="space-y-4">
                    {analysisData.room_recommendations.map((room: any, idx: number) => (
                      <div key={idx} className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-5 border border-green-200">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-bold text-gray-900 text-lg">{room.room_type}</h4>
                            <p className="text-sm text-gray-600">Size: {room.size}</p>
                          </div>
                          <span className="inline-block px-3 py-1 bg-green-200 text-green-800 text-xs font-semibold rounded-full">
                            📍 {room.placement}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{room.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. Detailed Explanation */}
              {analysisData.detailed_explanation && (
                <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Detailed Analysis</h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{analysisData.detailed_explanation}</p>
                </div>
              )}
            </div>
          )}

          {/* Smart House Analysis Results End */}
          {/* AI Analysis Results Section - For other sections */}
          {analysisData && activeSection !== 'smart-house-analysis' && !isFloorPlanSection && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">AI Design Analysis</h2>
                  {viewingDesign && (
                    <p className="text-sm text-gray-500 mt-1">Viewing saved design from {viewingDesign.savedDate}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {!viewingDesign && (
                    <button
                      onClick={handleSaveDesign}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? 'Saving...' : 'Save Design'}
                    </button>
                  )}
                  {viewingDesign && activeSection === 'saved-designs' && (
                    <button
                      onClick={() => {
                        handleDeleteDesign(viewingDesign.id);
                        setViewingDesign(null);
                        setAnalysisData(null);
                        clearUploadedImage();
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:shadow-lg transition font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Design
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setAnalysisData(null);
                      setViewingDesign(null);
                      clearUploadedImage();
                    }}
                    className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Analysis Success Message */}
              {generationSuccess && (
                <div className="flex items-center gap-2 mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-green-700">Room analysis completed successfully!</span>
                </div>
              )}

              {/* Analysis Error Message */}
              {generationError && (
                <div className="flex items-center gap-2 mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <span className="text-sm text-red-700">{generationError}</span>
                </div>
              )}

              {/* Analysis section-specific rendering */}
              {analysisData.analysis_section === 'wall-painting' ? (
                <>
                  {/* Wall Painting Analysis Overview */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 mb-6 border border-purple-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Wall Analysis</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-semibold">Overall Style:</span> {analysisData.overall_style || 'Modern'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">Lighting:</span> {analysisData.lighting_analysis || 'Good natural light'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Wall Recommendations with Hex Codes and Modern Purchase Buttons */}
                  <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border-l-4 border-purple-500">
                    <div className="flex items-center gap-2 mb-6">
                      <Palette className="w-6 h-6 text-purple-600" />
                      <h3 className="text-xl font-bold text-gray-900">Wall Color Recommendations</h3>
                    </div>
                    <div className="space-y-6">
                      {analysisData.wall_recommendations && analysisData.wall_recommendations.length > 0 ? (
                        analysisData.wall_recommendations.map((rec: any, idx: number) => (
                          <div key={idx} className="p-6 bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            {/* Top Section: Color Preview and Details */}
                            <div className="flex items-start gap-4 mb-4">
                              {/* Large Color Preview */}
                              <div className="flex-shrink-0">
                                <div 
                                  className="w-16 h-16 rounded-xl border-4 border-white shadow-md"
                                  style={{ backgroundColor: rec.hex_code || '#CCCCCC' }}
                                  title={rec.hex_code}
                                ></div>
                              </div>
                              
                              {/* Color Details */}
                              <div className="flex-1">
                                <h4 className="text-lg font-bold text-gray-900 mb-1">{rec.recommended_color}</h4>
                                <div className="flex items-center gap-3 flex-wrap">
                                  <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                                    {rec.wall_position}
                                  </span>
                                  <span className="inline-block px-3 py-1 bg-gray-200 text-gray-700 text-xs font-mono rounded-full">
                                    {rec.hex_code}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Reasoning Section */}
                            <div className="mb-5 pb-5 border-b border-gray-300">
                              <p className="text-sm text-gray-700 leading-relaxed">{rec.reason}</p>
                            </div>
                            
                            {/* Paint Products - Ecommerce Style Cards */}
                            {rec.paint_products && rec.paint_products.length > 0 && (
                              <div>
                                <p className="text-sm font-bold text-gray-800 mb-4">Available Paint Shades:</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {rec.paint_products.map((product: any, optIdx: number) => (
                                    <div key={optIdx} className="bg-white border border-gray-300 rounded-lg overflow-hidden hover:border-blue-400 hover:shadow-lg transition-all duration-200 flex flex-col">
                                      {/* Product Header */}
                                      <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 border-b border-blue-200">
                                        <span className="inline-block px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-full mb-2">
                                          {product.brand}
                                        </span>
                                      </div>

                                      {/* Product Details */}
                                      <div className="px-4 py-4 flex-1 space-y-3">
                                        {/* Shade Name */}
                                        <div>
                                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Shade Name</p>
                                          <p className="text-sm font-semibold text-gray-900">{product.shade_name}</p>
                                        </div>

                                        {/* Color Family */}
                                        <div>
                                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Color Family</p>
                                          <div className="inline-block px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                                            {product.color_family || 'Neutral'}
                                          </div>
                                        </div>

                                        {/* Color Swatch */}
                                        <div className="pt-2">
                                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Color Preview</p>
                                          <div 
                                            className="w-full h-16 rounded-lg border-2 border-gray-300 shadow-sm"
                                            style={{ backgroundColor: rec.hex_code || '#CCCCCC' }}
                                          ></div>
                                        </div>
                                      </div>

                                      {/* CTA Button */}
                                      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                                        <a
                                          href={product.official_link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center justify-center gap-2 w-full px-3 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
                                        >
                                          <ShoppingCart className="w-4 h-4" />
                                          <span>View Catalogue</span>
                                        </a>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-600">No color recommendations available</p>
                      )}
                    </div>
                  </div>
                </>              ) : analysisData.analysis_section === 'furniture' ? (
                <>
                  {/* Furniture Design Analysis Overview */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 mb-6 border border-amber-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Room Analysis</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-semibold">Room Characteristics:</span> {analysisData.room_analysis || 'Room analyzed'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">Space Constraints:</span> {analysisData.space_constraints || 'Space optimized'}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">Overall Style:</span> {analysisData.overall_style || 'Contemporary'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Furniture Recommendations */}
                  <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border-l-4 border-amber-500">
                    <div className="flex items-center gap-2 mb-6">
                      <Armchair className="w-6 h-6 text-amber-600" />
                      <h3 className="text-xl font-bold text-gray-900">Furniture Recommendations</h3>
                    </div>
                    <div className="space-y-6">
                      {analysisData.furniture_recommendations && analysisData.furniture_recommendations.length > 0 ? (
                        analysisData.furniture_recommendations.map((furniture: any, idx: number) => (
                          <div key={idx} className="p-6 bg-gradient-to-br from-white via-amber-50 to-orange-50 rounded-xl border border-amber-200 shadow-sm hover:shadow-md transition-shadow">
                            {/* Furniture Header */}
                            <div className="mb-4">
                              <h4 className="text-lg font-bold text-gray-900 mb-2">{furniture.furniture_item}</h4>
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="inline-block px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                                  {furniture.placement}
                                </span>
                                <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                                  Style: {furniture.recommended_style}
                                </span>
                                <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
                                  Color: {furniture.recommended_color}
                                </span>
                              </div>
                            </div>

                            {/* Reason Section */}
                            <div className="mb-5 pb-5 border-b border-amber-200">
                              <p className="text-sm text-gray-700 leading-relaxed">{furniture.reason}</p>
                            </div>

                            {/* Purchase Options */}
                            {furniture.purchase_options && furniture.purchase_options.length > 0 && (
                              <div>
                                <p className="text-sm font-bold text-gray-800 mb-3">Buy Online:</p>
                                <div className="flex gap-3 flex-wrap">
                                  {furniture.purchase_options.map((option: any, optIdx: number) => (
                                    <a
                                      key={optIdx}
                                      href={option.search_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold text-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
                                    >
                                      <ShoppingCart className="w-4 h-4" />
                                      <span>{option.store}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-600">No furniture recommendations available</p>
                      )}
                    </div>
                  </div>
                </>              ) : (
                <>
                  {/* Default multi-category analysis overview */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 mb-6 border border-blue-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Design Overview</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-semibold">Overall Style:</span> {analysisData.overall_style || 'Modern'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">Color Palette:</span> {analysisData.color_palette || 'Contemporary'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Wall Colors Section */}
                  <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border-l-4 border-purple-500">
                    <div className="flex items-center gap-2 mb-4">
                      <Palette className="w-6 h-6 text-purple-600" />
                      <h3 className="text-xl font-bold text-gray-900">Wall Color Recommendations</h3>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      {analysisData.wall_colors && analysisData.wall_colors.length > 0 ? (
                        analysisData.wall_colors.map((color: string, idx: number) => (
                          <div key={idx} className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-1">
                                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-400 to-purple-600"></div>
                              </div>
                              <p className="text-sm font-medium text-gray-900">{color}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-600 col-span-3">No color recommendations available</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Show furniture, plants, and tips only for plants-decor section */}
              {analysisData.analysis_section === 'plants-decor' && (
                <>
                  {/* Plants & Decor Analysis Overview */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 mb-6 border border-green-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Room Analysis</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-semibold">Room Characteristics:</span> {analysisData.room_analysis || 'Room analyzed'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">Decor Theme:</span> {analysisData.decor_theme || 'Modern'}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">Overall Style:</span> {analysisData.overall_style || 'Contemporary'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Plants & Decor Recommendations */}
                  <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border-l-4 border-green-500">
                    <div className="flex items-center gap-2 mb-6">
                      <Leaf className="w-6 h-6 text-green-600" />
                      <h3 className="text-xl font-bold text-gray-900">Plants & Decor Recommendations</h3>
                    </div>
                    <div className="space-y-6">
                      {analysisData.plant_decor_recommendations && analysisData.plant_decor_recommendations.length > 0 ? (
                        analysisData.plant_decor_recommendations.map((item: any, idx: number) => (
                          <div key={idx} className="p-6 bg-gradient-to-br from-white via-green-50 to-emerald-50 rounded-xl border border-green-200 shadow-sm hover:shadow-md transition-shadow">
                            {/* Item Header */}
                            <div className="mb-4">
                              <h4 className="text-lg font-bold text-gray-900 mb-2">{item.item_name}</h4>
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full capitalize">
                                  {item.category}
                                </span>
                                <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                                  Placement: {item.placement}
                                </span>
                                <span className="inline-block px-3 py-1 bg-lime-100 text-lime-700 text-xs font-semibold rounded-full">
                                  Style: {item.style}
                                </span>
                              </div>
                            </div>

                            {/* Reason Section */}
                            <div className="mb-5 pb-5 border-b border-green-200">
                              <p className="text-sm text-gray-700 leading-relaxed">{item.reason}</p>
                            </div>

                            {/* Purchase Options */}
                            {item.purchase_options && item.purchase_options.length > 0 && (
                              <div>
                                <p className="text-sm font-bold text-gray-800 mb-3">Buy Online:</p>
                                <div className="flex gap-3 flex-wrap">
                                  {item.purchase_options.map((option: any, optIdx: number) => (
                                    <a
                                      key={optIdx}
                                      href={option.search_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold text-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
                                    >
                                      <ShoppingCart className="w-4 h-4" />
                                      <span>{option.store}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-600">No plant and decor recommendations available</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Recent Designs - Hide when viewing saved design */}
          {!isDashboardHome && !viewingDesign && activeSection !== 'saved-designs' && !isFloorPlanSection && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Recent Designs</h2>
                {savedDesigns.filter(d => d.category === activeSection).length < 6 && (
                  <button
                    onClick={() => {
                      // Clear uploaded image and preview
                      setUploadedImage(null);
                      setUploadedFileName(null);
                      setUploadedImagePath(null);
                      
                      // Clear all AI results
                      setAnalysisData(null);
                      setGenerationError(null);
                      setGenerationSuccess(false);
                      setUploadSuccess(false);
                      setUploadError(null);
                      setIsGenerating(false);
                      setIsAnalyzingHouse(false);
                      
                      // Reset all form inputs to initial state
                      setTotalFamilyMembers(4);
                      setAdults(2);
                      setChildren(2);
                      setSeniorCitizens(0);
                      setPlotSize('2000');
                      setNumberOfFloors(2);
                      setBudget('500000');
                      
                      // Scroll to top
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition"
                  >
                    <Plus className="w-5 h-5" />
                    New Design
                  </button>
                )}
              </div>

              {/* Design Cards Grid */}
              {savedDesigns.filter(d => d.category === activeSection).length > 0 ? (
                <div className="grid md:grid-cols-3 gap-6">
                  {savedDesigns.filter(d => d.category === activeSection).map((design) => (
                    <div
                      key={design.id}
                      className="bg-white rounded-xl shadow hover:shadow-xl transition overflow-hidden group"
                    >
                      <div className="aspect-video relative overflow-hidden bg-gray-100 cursor-pointer" onClick={() => handleViewSavedDesign(design)}>
                        <img
                          src={design.imageBase64}
                          alt={design.fileName}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                          <ArrowUpRight className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition" />
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1 truncate">{design.fileName}</h4>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(design.savedDate).toLocaleDateString()}</span>
                            </div>
                            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full capitalize">
                              {design.category === 'wall-painting' ? 'Wall Paint' : design.category === 'furniture' ? 'Furniture' : design.category === 'plants-decor' ? 'Plants & Decor' : design.category === 'smart-house-analysis' ? 'Smart House Analysis' : design.category}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteDesign(design.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                            title="Delete design"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleViewSavedDesign(design)}
                          className="w-full mt-3 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-md transition"
                        >
                          View Design
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bookmark className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">No Saved Designs Yet</h3>
                  <p className="text-gray-600">
                    Generate a design and click "Save Design" to keep it for later
                  </p>
                </div>
              )}
            </div>
          )}


        </div>
      </div>
    </div>
  );
}
