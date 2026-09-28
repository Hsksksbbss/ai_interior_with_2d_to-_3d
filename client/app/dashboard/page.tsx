'use client';

import { useState, useRef, useEffect } from 'react';
import { Menu, X, LogOut, Upload, Image, Video, Palette, Armchair, Leaf, Bookmark, Plus, ArrowUpRight, Home, CheckCircle, AlertCircle, ShoppingCart, Save, Trash2, Calendar, Globe } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Analyze2DFloorPlan from '../../components/Analyze2DFloorPlan';
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
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null);

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
    if (!supabase) {
      router.replace('/login');
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) setAuthReady(true);
      else router.replace('/login');
    });

    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setAuthReady(true);
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload a valid image (JPG, JPEG, or PNG)');
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert('File size must be less than 10MB');
        return;
      }

      // Store file reference for backend upload
      fileRef.current = file;

      // Read and preview the image
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageDataUrl = event.target?.result as string;
        setUploadedImage(imageDataUrl);
        setUploadedFileName(file.name);
        setUploadSuccess(false);
        setUploadError(null);
        console.log('Image ready for upload:', file.name);
      };
      reader.readAsDataURL(file);
    }
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
        'http://127.0.0.1:8000/upload-image',
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

      let generateResponse;
      
      // Use furniture-specific endpoint for furniture section
      if (activeSection === 'furniture') {
        console.log('Calling furniture design endpoint...');
        const generateFormData = new FormData();
        generateFormData.append('image_path', uploadedPath);

        generateResponse = await axios.post(
          'http://127.0.0.1:8000/generate-furniture-design',
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
          'http://127.0.0.1:8000/generate-plants-decor',
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
          'http://127.0.0.1:8000/generate-design',
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
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Failed to process request';
      
      if (isGenerating) {
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

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('Video uploaded:', file.name);
      // TODO: Handle video upload to backend
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
  const ActiveIcon = activeSecData?.icon || Palette;

  if (!authReady) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-500">Checking your session...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full bg-white shadow-lg transition-all duration-300 z-40 ${
          isSidebarOpen ? 'w-64' : 'w-0'
        } overflow-hidden`}
      >
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold text-white">🎨</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              DesignAI
            </span>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  activeSection === section.id
                    ? 'bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 font-semibold border-l-4 border-purple-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{section.title}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition font-medium"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${
          isSidebarOpen ? 'ml-64' : 'ml-0'
        }`}
      >
        {/* Top Header */}
        <div className="bg-white shadow-sm border-b sticky top-0 z-30">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              {viewingDesign && activeSection === 'saved-designs' ? (
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
                <h1 className="text-2xl font-bold text-gray-900">{activeSecData?.title}</h1>
              )}
            </div>
            <div className="flex items-center gap-4">
              {/* Language Selector */}
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                <Globe className="w-5 h-5 text-gray-600" />
                <select
                  value={language}
                  onChange={(e) => {
                    const newLanguage = e.target.value as Language;
                    setLanguage(newLanguage);
                    localStorage.setItem('preferredLanguage', newLanguage);
                  }}
                  className="bg-gray-100 border-none text-gray-900 font-medium cursor-pointer focus:outline-none"
                >
                  <option value="english">English</option>
                  <option value="bengali">বাংলা</option>
                </select>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold cursor-pointer">
                👤
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8">
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
                  <button
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
                          'http://127.0.0.1:8000/analyze-smart-house',
                          formData
                        );

                        setAnalysisData(response.data.analysis);
                        setGenerationSuccess(true);
                        setTimeout(() => setGenerationSuccess(false), 4000);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      } catch (error: any) {
                        const errorMessage =
                          error.response?.data?.detail ||
                          error.response?.data?.message ||
                          error.message ||
                          'Failed to analyze house';
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
                    {isAnalyzingHouse ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Analyzing Your Home...
                      </>
                    ) : (
                      'Analyze House'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSection('analyze-2d-floor-plan')}
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
                        onClick={() => setActiveSection('wall-painting')}
                        className="px-6 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:shadow-lg transition"
                      >
                        Analyze Wall
                      </button>
                      <button
                        onClick={() => setActiveSection('furniture')}
                        className="px-6 py-3 bg-white/20 text-white border border-white rounded-lg font-semibold hover:bg-white/30 transition"
                      >
                        Analyze Furniture
                      </button>
                      <button
                        onClick={() => setActiveSection('plants-decor')}
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

          {activeSection === 'analyze-2d-floor-plan' && <Analyze2DFloorPlan />}

          {/* Saved Designs Gallery - When viewing saved-designs tab */}
          {activeSection === 'saved-designs' && !viewingDesign && (
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
                    onClick={() => setActiveSection('wall-painting')}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition font-semibold"
                  >
                    Create Design
                  </button>
                </div>
              )}
            </>
          )}

          {/* Section Description - For other sections */}
          {activeSection !== 'saved-designs' && activeSection !== 'smart-house-analysis' && !isFloorPlanSection && (
            <div className="mb-8">
              <p className="text-gray-600 text-lg">{activeSecData?.description}</p>
            </div>
          )}

          {/* Upload Options - Hide when on saved-designs or smart-house-analysis */}
          {activeSection !== 'saved-designs' && activeSection !== 'smart-house-analysis' && !isFloorPlanSection && (
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Image Upload Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition">
              <div className={`w-16 h-16 bg-gradient-to-br ${activeSecData?.color} rounded-xl flex items-center justify-center mb-4`}>
                <Image className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Upload Image</h3>
              <p className="text-gray-600 mb-6">
                Upload a photo of your room to see AI-powered design suggestions
              </p>
              <button
                onClick={() => imageInputRef.current?.click()}
                className={`w-full py-3 bg-gradient-to-r ${activeSecData?.color} text-white rounded-xl font-semibold hover:shadow-lg transition transform hover:scale-105 flex items-center justify-center gap-2`}
              >
                <Upload className="w-5 h-5" />
                Choose Image
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"        
              />
            </div>

            {/* Video Upload Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition">
              <div className={`w-16 h-16 bg-gradient-to-br ${activeSecData?.color} rounded-xl flex items-center justify-center mb-4 opacity-70`}>
                <Video className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Upload Video</h3>
              <p className="text-gray-600 mb-6">
                Upload a video walkthrough for comprehensive design analysis
              </p>
              <button
                onClick={() => videoInputRef.current?.click()}
                className={`w-full py-3 bg-gradient-to-r ${activeSecData?.color} text-white rounded-xl font-semibold opacity-70 hover:opacity-100 hover:shadow-lg transition transform hover:scale-105 flex items-center justify-center gap-2 disabled:cursor-not-allowed`}
                disabled
              >
                <Upload className="w-5 h-5" />
                Choose Video
              </button>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="hidden"
              />
              <p className="text-xs text-gray-500 mt-2">Coming Soon</p>
            </div>
          </div>
          )}

          {/* Image Preview Section - Hide when on saved-designs or smart-house-analysis */}
          {activeSection !== 'saved-designs' && activeSection !== 'smart-house-analysis' && !isFloorPlanSection && uploadedImage && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Image Preview</h2>
                <button
                  onClick={clearUploadedImage}
                  disabled={isUploading}
                  className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
              </div>
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="relative max-h-96 overflow-hidden flex items-center justify-center bg-gray-100">
                  <img
                    src={uploadedImage}
                    alt="Uploaded preview"
                    className="w-full h-auto object-contain"
                  />
                </div>
                <div className="p-6 border-t">
                  <p className="text-sm text-gray-600 mb-4">
                    <span className="font-semibold">File:</span> {uploadedFileName}
                  </p>

                  {/* Success Message */}
                  {uploadSuccess && (
                    <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm text-green-700">Image uploaded successfully!</span>
                    </div>
                  )}

                  {/* Error Message */}
                  {uploadError && (
                    <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <span className="text-sm text-red-700">{uploadError}</span>
                    </div>
                  )}

                  <button
                    onClick={handleAnalyzeWithAI}
                    disabled={isUploading || isGenerating}
                    className={`w-full py-3 bg-gradient-to-r ${activeSecData?.color} text-white rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                  >
                    {isUploading || isGenerating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {isUploading ? 'Uploading...' : 'Generating...'}
                      </>
                    ) : (
                      'Analyze with AI'
                    )}
                  </button>
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
          {!viewingDesign && activeSection !== 'saved-designs' && !isFloorPlanSection && (
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
