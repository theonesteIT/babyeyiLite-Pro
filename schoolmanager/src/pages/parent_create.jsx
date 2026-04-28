import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Save, 
  X, 
  Search, 
  GraduationCap, 
  ChevronRight,
  ChevronLeft,
  User,
  MapPin,
  Plus,
  Mail,
  Phone,
  CheckCircle2,
  Heart,
  ArrowLeft,
  Camera,
  Briefcase,
  Smartphone,
  Tag,
  Users
} from 'lucide-react';

const sampleStudents = [
  { name: 'Jean Baptiste Murenzi', class: 'Senior 1A', gender: 'M' },
  { name: 'Marie Claire Uwase', class: 'Senior 1A', gender: 'F' },
  { name: 'Samuel Bizimana', class: 'Senior 4 PCM', gender: 'M' },
  { name: 'Diane Umutoni', class: 'Primary 6', gender: 'F' },
  { name: 'Robert Ntaganda', class: 'Senior 3', gender: 'M' },
];

const relationTypes = ['Father', 'Mother', 'Guardian', 'Uncle', 'Aunt', 'Brother', 'Sister', 'Other'];

export default function ParentCreate() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Students');
  const [currentStep, setCurrentStep] = useState('Draft');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    occupation: '',
    workPhone: '',
    address: '',
    nationalId: '',
    bankAccount: ''
  });

  const [assignedStudents, setAssignedStudents] = useState([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState('Search'); // 'Search' or 'Relation'
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentForAssign, setSelectedStudentForAssign] = useState(null);
  const [selectedRelation, setSelectedRelation] = useState('Father');

  const tabs = ['Students', 'Private Info'];
  const steps = ['Draft', 'Review'];
  const modalSteps = ['Search', 'Relation'];

  const filteredStudents = sampleStudents.filter(s => 
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) &&
    !assignedStudents.some(as => as.name === s.name)
  );

  const handleAssign = () => {
    if (selectedStudentForAssign) {
      setAssignedStudents([...assignedStudents, { ...selectedStudentForAssign, relation: selectedRelation }]);
      closeModal();
    }
  };

  const closeModal = () => {
    setIsAssignModalOpen(false);
    setModalStep('Search');
    setStudentSearch('');
    setSelectedStudentForAssign(null);
    setSelectedRelation('Father');
  };

  const handleRemoveStudent = (name) => {
    setAssignedStudents(assignedStudents.filter(s => s.name !== name));
  };

  const handleUpdateRelation = (name, newRelation) => {
    setAssignedStudents(assignedStudents.map(s => s.name === name ? { ...s, relation: newRelation } : s));
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Students':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Linked Children</h3>
                <button 
                  onClick={() => setIsAssignModalOpen(true)}
                  className="bg-[#000435] text-white px-4 py-1.5 rounded text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#000435]/20 hover:scale-105 transition-all"
                >
                  <Plus size={12} className="inline-block mr-1 mb-0.5" /> Link Student
                </button>
             </div>

             {assignedStudents.length === 0 ? (
               <div 
                 onClick={() => setIsAssignModalOpen(true)}
                 className="py-20 bg-transparent  rounded flex flex-col items-center justify-center text-center space-y-6 cursor-pointer group hover:bg-slate-50/50 hover:border-[#0E407C]/20 transition-all"
               >
                  <div className="relative">
                    <Users size={64} strokeWidth={1} className="text-slate-100 group-hover:text-[#0E407C] transition-all" />
                    <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-[#0E407C] text-white flex items-center justify-center border-2 border-white scale-0 group-hover:scale-100 transition-transform shadow-lg">
                       <Plus size={16} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-black text-slate-800 uppercase tracking-[0.2em]">Unlinked</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">No students linked to this parent profile</p>
                  </div>
                  <div className="pt-4">
                     <span className="text-[10px] font-black text-[#0E407C] uppercase tracking-widest border-b-2 border-[#0E407C]/10 pb-1 group-hover:border-[#0E407C] transition-all">
                       Link Students +
                     </span>
                  </div>
               </div>
             ) : (
               <div className="space-y-2">
                  {assignedStudents.map(student => (
                    <motion.div 
                      key={student.name}
                      layoutId={student.name}
                      className="bg-transparent py-6 border-b border-slate-100 flex items-center justify-between group transition-all"
                    >
                       <div className="flex items-center gap-6 flex-1">
                          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-xl font-black text-[#000435] border border-slate-100 group-hover:scale-105 transition-transform shadow-sm">
                            {student.name.charAt(0)}
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-lg font-black text-slate-800 tracking-tight">{student.name}</h4>
                            <div className="flex items-center gap-3">
                               <span className="px-3 py-1 rounded-full bg-[#000435]/5 text-[#000435] text-[10px] font-black uppercase tracking-widest border border-[#000435]/10">
                                 {student.class}
                               </span>
                               <span className="text-slate-300 text-xs font-medium">|</span>
                               <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Student Record</span>
                            </div>
                          </div>
                       </div>

                       <div className="flex items-center gap-12">
                          <div className="flex flex-col items-end gap-1">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Relationship</label>
                             <div className="relative">
                                <select 
                                  className="bg-transparent text-sm font-black text-[#0E407C] border-none focus:ring-0 appearance-none cursor-pointer text-right pr-6"
                                  value={student.relation}
                                  onChange={(e) => handleUpdateRelation(student.name, e.target.value)}
                                >
                                  {relationTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                  ))}
                                </select>
                                <ChevronRight size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-[#0E407C] pointer-events-none rotate-90" />
                             </div>
                          </div>
                          <button 
                            onClick={() => handleRemoveStudent(student.name)}
                            className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                          >
                            <X size={24} />
                          </button>
                       </div>
                    </motion.div>
                  ))}
               </div>
             )}
          </div>
        );
      case 'Private Info':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-in fade-in duration-500">
             <div className="space-y-6">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Identification</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-3 items-center">
                  <label className="text-sm font-semibold text-slate-700">National ID</label>
                  <input type="text" placeholder="1 1990 8 0000000 0 00" className="col-span-2 text-sm bg-transparent border-b border-slate-200 py-1.5 focus:outline-none focus:border-[#000435]" />
                </div>
                <div className="grid grid-cols-3 items-center">
                  <label className="text-sm font-semibold text-slate-700">Passport No.</label>
                  <input type="text" placeholder="Optional" className="col-span-2 text-sm bg-transparent border-b border-slate-200 py-1.5 focus:outline-none focus:border-[#000435]" />
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Finance</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-3 items-center">
                  <label className="text-sm font-semibold text-slate-700">Bank Account</label>
                  <input type="text" placeholder="Account Number" className="col-span-2 text-sm bg-transparent border-b border-slate-200 py-1.5 focus:outline-none focus:border-[#000435] font-mono" />
                </div>
                <div className="grid grid-cols-3 items-center">
                  <label className="text-sm font-semibold text-slate-700">Billing Address</label>
                  <input type="text" placeholder="Kigali, Rwanda" className="col-span-2 text-sm bg-transparent border-b border-slate-200 py-1.5 focus:outline-none focus:border-[#000435]" />
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 overflow-hidden font-sans">
      <style>{`
        .breadcrumb-container { display: flex; align-items: center; }
        .breadcrumb-step {
          position: relative; padding: 6px 20px 6px 30px; background: #f1f5f9; color: #64748b;
          font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
          clip-path: polygon(0% 0%, 90% 0%, 100% 50%, 90% 100%, 0% 100%, 10% 50%);
          margin-right: -10px; transition: all 0.2s; cursor: pointer;
        }
        .breadcrumb-step:first-child { clip-path: polygon(0% 0%, 90% 0%, 100% 50%, 90% 100%, 0% 100%); padding-left: 15px; }
        .breadcrumb-step.active { background: #0E407C; color: white; z-index: 10; }
        .breadcrumb-step.completed { background: #e2e8f0; color: #0E407C; }
      `}</style>

      {/* Top Action Bar */}
      <div className="flex items-center justify-between px-6 py-2 bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Link to="/students/parents" className="text-slate-400 hover:text-[#000435] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex flex-col">
            <h2 className="text-base font-bold text-slate-800 -mt-1">Parent Registration Form</h2>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="breadcrumb-container">
            {steps.map((step, idx) => (
              <div key={step} onClick={() => setCurrentStep(step)}
                className={`breadcrumb-step ${currentStep === step ? 'active' : ''} ${steps.indexOf(currentStep) > idx ? 'completed' : ''}`}
              >
                {step}
              </div>
            ))}
          </div>
          <div className="h-6 w-[1px] bg-slate-200" />
          <button 
            onClick={() => navigate('/students/parents')}
            className="bg-primary hover:bg-primary/90 text-white px-5 py-1.5 rounded font-bold text-xs uppercase tracking-wider shadow-md shadow-primary/20 transition-all flex items-center gap-2"
          >
            <Save size={14} /> Finish & Save
          </button>
        </div>
      </div>

      <div className="w-full overflow-y-auto custom-scrollbar">
        <div className="p-8">

          {/* Identity Section */}
          <div className="flex items-start gap-8 mb-8">
            <div className="relative group cursor-pointer">
              <div className="w-32 h-32 bg-slate-100 rounded-sm border-2 border-dashed border-slate-300 flex items-center justify-center transition-all group-hover:border-primary group-hover:bg-slate-50">
                <div className="flex flex-col items-center text-slate-400 group-hover:text-primary">
                  <Camera className="w-8 h-8 mb-1" />
                  <span className="text-[10px] font-bold uppercase">Parent Photo</span>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <input type="text" placeholder="Parent's Full Legal Name (e.g. Eric Kayisire)"
                className="w-full text-3xl font-medium border-b border-slate-200 pb-2 focus:outline-none focus:border-primary transition-colors placeholder:text-slate-300"
              />

              <div className="grid grid-cols-1 md:grid-cols-2  gap-x-8 gap-y-3">
                <div className="flex items-center gap-3 group">
                  <Smartphone className="w-4 h-4 text-slate-400 group-focus-within:text-primary" />
                  <input type="text" placeholder="Primary Phone Number" className="flex-1 text-sm bg-transparent border-b border-transparent focus:border-slate-200 focus:outline-none py-0.5" />
                </div>
                <div className="flex items-center gap-3 group">
                  <Mail className="w-4 h-4 text-slate-400 group-focus-within:text-primary" />
                  <input type="text" placeholder="Email Address" className="flex-1 text-sm bg-transparent border-b border-transparent focus:border-slate-200 focus:outline-none py-0.5" />
                </div>
                <div className="flex items-center gap-3 group">
                  <Briefcase className="w-4 h-4 text-slate-400 group-focus-within:text-primary" />
                  <input type="text" placeholder="Occupation / Profession" className="flex-1 text-sm bg-transparent border-b border-transparent focus:border-slate-200 focus:outline-none py-0.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 mb-6">
            {tabs.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 text-sm font-medium transition-all relative ${activeTab === tab ? 'text-primary' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
              >
                {tab}
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </button>
            ))}
          </div>

          {/* Tab Content Rendering */}
          <div className="min-h-[300px]">
            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* Integrated Discovery & Relation Modal */}
      <AnimatePresence>
        {isAssignModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#000435]/40 backdrop-blur-sm"
              onClick={closeModal}
            />
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="bg-white shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden relative z-10 rounded-xl border border-slate-200 font-sans"
            >
              {/* Modal Header with Progress Step - MATCHING PAGE STYLE */}
              <div className="px-6 py-2 border-b border-slate-200 flex items-center justify-between bg-white">
                <div className="flex items-center gap-4">
                   <h3 className="text-sm font-bold text-slate-800">
                     Link Student Record
                   </h3>
                   <div className="h-4 w-[1px] bg-slate-200" />
                   <div className="breadcrumb-container">
                     {modalSteps.map((step, idx) => (
                       <div key={step} onClick={() => selectedStudentForAssign && setModalStep(step)}
                         className={`breadcrumb-step ${modalStep === step ? 'active' : ''} ${modalSteps.indexOf(modalStep) > idx ? 'completed' : ''}`}
                       >
                         {step}
                       </div>
                     ))}
                   </div>
                </div>

                <button onClick={closeModal} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-all">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden bg-white">
                {modalStep === 'Search' ? (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex-1 flex flex-col overflow-hidden"
                  >
                    <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-white">
                      <div className="flex-1 max-w-md relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#000435] transition-colors" size={16} />
                        <input 
                          type="text" 
                          placeholder="Search by student name..."
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-[#000435] focus:ring-4 focus:ring-[#000435]/5 transition-all"
                        />
                      </div>
                      <div className="flex items-center gap-4 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                        <span>1-{filteredStudents.length} / {filteredStudents.length}</span>
                        <div className="flex items-center gap-1">
                          <button className="p-1 hover:bg-slate-100 rounded text-slate-400"><ChevronLeft size={16} /></button>
                          <button className="p-1 hover:bg-slate-100 rounded text-slate-400"><ChevronRight size={16} /></button>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-[#000435] text-[11px] font-bold bg-white sticky top-0 z-10">
                            <th className="px-6 py-3 uppercase tracking-wider">Student Name</th>
                            <th className="px-6 py-3 uppercase tracking-wider">Class</th>
                            <th className="px-6 py-3 uppercase tracking-wider">Gender</th>
                            <th className="px-6 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="text-[11px]">
                          {filteredStudents.map((item, idx) => (
                            <tr key={idx} className={`border-b border-slate-200 cursor-pointer transition-colors hover:bg-[#000435]/5 ${idx % 2 !== 0 ? 'bg-slate-50' : 'bg-white'}`}>
                              <td className="px-6 py-2.5">
                                <div className="flex items-center gap-3">
                                  <div className="w-7 h-7 rounded-full bg-[#000435]/10 flex items-center justify-center text-[10px] font-bold text-[#000435] border border-[#000435]/20 uppercase">
                                    {item.name.charAt(0)}
                                  </div>
                                  <span className="font-bold text-slate-700">{item.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-2.5 font-bold text-slate-400 uppercase tracking-widest">{item.class}</td>
                              <td className="px-6 py-2.5 font-medium text-slate-400">{item.gender === 'M' ? 'Male' : 'Female'}</td>
                              <td className="px-6 py-2.5 text-right">
                                <button onClick={() => { setSelectedStudentForAssign(item); setModalStep('Relation'); }} className="bg-white hover:bg-[#000435] hover:text-white text-[#000435] px-3 py-1 rounded border border-[#000435]/20 text-[10px] font-bold uppercase transition-all shadow-sm">
                                  Select
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex-1 p-12 bg-white"
                  >
                    <div className="max-w-2xl mx-auto space-y-12">
                       {/* Finalize Header - Matches Page Identity Style */}
                       <div className="flex items-center gap-8 pb-8 border-b border-slate-100">
                          <div className="w-24 h-24 rounded-sm border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-2xl font-black text-slate-300">
                            {selectedStudentForAssign.name.charAt(0)}
                          </div>
                          <div className="space-y-4 flex-1">
                             <h4 className="text-2xl font-medium text-slate-800">{selectedStudentForAssign.name}</h4>
                             <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                                <div className="flex items-center gap-2">
                                   <Tag size={14} className="text-slate-300" />
                                   <span className="text-sm text-slate-500 font-medium">{selectedStudentForAssign.class}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                   <Users size={14} className="text-slate-300" />
                                   <span className="text-sm text-slate-500 font-medium">{selectedStudentForAssign.gender === 'M' ? 'Male' : 'Female'}</span>
                                </div>
                             </div>
                          </div>
                       </div>

                       {/* Relation Choice - Form Style */}
                       <div className="space-y-4 pt-4">
                          <div className="grid grid-cols-3 items-center">
                             <label className="text-sm font-semibold text-slate-700">Define Relationship</label>
                             <div className="col-span-2 relative">
                                <select 
                                  className="w-full text-sm bg-transparent border-b border-slate-200 py-1.5 focus:outline-none focus:border-[#0E407C] appearance-none cursor-pointer font-medium text-slate-700"
                                  value={selectedRelation}
                                  onChange={(e) => setSelectedRelation(e.target.value)}
                                >
                                  {relationTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                  ))}
                                </select>
                                <ChevronRight size={14} className="text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none rotate-90" />
                             </div>
                          </div>
                       </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between">
                <div>
                   {modalStep === 'Relation' ? (
                     <button 
                        onClick={() => setModalStep('Search')}
                        className="text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
                      >
                        <ChevronLeft size={14} /> Back to Search
                      </button>
                   ) : (
                     <button 
                        onClick={() => navigate('/students/new')}
                        className="text-[#0E407C] hover:text-[#0E407C]/80 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all px-4 py-2 rounded-lg hover:bg-slate-50"
                      >
                        <Plus size={16} /> Create New Student
                      </button>
                   )}
                </div>
                
                <div className="flex items-center gap-4">
                   <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase tracking-widest transition-all">
                      Cancel
                   </button>
                   {modalStep === 'Relation' && (
                     <button 
                        onClick={handleAssign}
                        className="bg-[#0E407C] text-white px-6 py-2 rounded font-bold text-[10px] uppercase tracking-widest shadow-md shadow-[#0E407C]/20 hover:opacity-90 transition-all flex items-center gap-2"
                      >
                        Complete Link <CheckCircle2 size={14} />
                      </button>
                   )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
