export const statsCards = [
  { label: 'Total Assets', value: '2,847', change: '+12%', color: 'from-amber-400 to-amber-600' },
  { label: 'Active Assets', value: '1,892', change: '+8%', color: 'from-emerald-400 to-emerald-600' },
  { label: 'Assigned Assets', value: '1,245', change: '+5%', color: 'from-blue-400 to-blue-600' },
  { label: 'Under Maintenance', value: '156', change: '-3%', color: 'from-amber-300 to-amber-500' },
  { label: 'Damaged Assets', value: '43', change: '+2%', color: 'from-red-400 to-red-600' },
  { label: 'Lost Assets', value: '18', change: '0%', color: 'from-gray-400 to-gray-600' },
  { label: 'Asset Value', value: '$12.4M', change: '+15%', color: 'from-purple-400 to-purple-600' },
  { label: 'Monthly Depreciation', value: '$124K', change: '-', color: 'from-cyan-400 to-cyan-600' },
]

export const pieChartData = [
  { name: 'IT Equipment', value: 850, color: '#ffc107' },
  { name: 'Furniture', value: 520, color: '#000435' },
  { name: 'Vehicles', value: 180, color: '#ff8f00' },
  { name: 'Electronics', value: 340, color: '#4c6ef5' },
  { name: 'Machinery', value: 120, color: '#ff6f00' },
]

export const lineChartData = [
  { month: 'Jan', value: 8.2, maintenance: 1.2 },
  { month: 'Feb', value: 8.5, maintenance: 1.0 },
  { month: 'Mar', value: 9.1, maintenance: 1.5 },
  { month: 'Apr', value: 8.8, maintenance: 1.3 },
  { month: 'May', value: 9.4, maintenance: 1.8 },
  { month: 'Jun', value: 10.2, maintenance: 2.1 },
  { month: 'Jul', value: 10.8, maintenance: 1.9 },
  { month: 'Aug', value: 11.2, maintenance: 2.4 },
  { month: 'Sep', value: 11.5, maintenance: 2.0 },
  { month: 'Oct', value: 11.8, maintenance: 2.3 },
  { month: 'Nov', value: 12.0, maintenance: 2.5 },
  { month: 'Dec', value: 12.4, maintenance: 2.8 },
]

export const donutData = [
  { name: 'IT', value: 35, color: '#ffc107' },
  { name: 'HR', value: 20, color: '#000435' },
  { name: 'Finance', value: 15, color: '#ff8f00' },
  { name: 'Operations', value: 18, color: '#4c6ef5' },
  { name: 'Admin', value: 12, color: '#ff6f00' },
]

export const conditionData = [
  { name: 'Excellent', value: 45, color: '#10b981' },
  { name: 'Good', value: 30, color: '#3b82f6' },
  { name: 'Fair', value: 15, color: '#f59e0b' },
  { name: 'Poor', value: 10, color: '#ef4444' },
]

export const recentActivities = [
  { action: 'New Asset Added', item: 'Dell Latitude 5420', user: 'John Doe', time: '2 hours ago', type: 'add' },
  { action: 'Asset Transferred', item: 'HP LaserJet Pro', user: 'Sarah Smith', time: '4 hours ago', type: 'transfer' },
  { action: 'Asset Assigned', item: 'iPhone 15 Pro', user: 'Mike Johnson', time: '6 hours ago', type: 'assign' },
  { action: 'Maintenance Completed', item: 'Toyota Camry 2023', user: 'Tech Team', time: '1 day ago', type: 'maintenance' },
  { action: 'New Asset Added', item: 'MacBook Pro M3', user: 'Emily Davis', time: '1 day ago', type: 'add' },
  { action: 'Asset Disposed', item: 'Old Server Rack', user: 'Admin', time: '2 days ago', type: 'dispose' },
]

export const assets = [
  { id: 'AST-001', name: 'Dell Latitude 5420', code: 'IT-LAP-001', category: 'IT Equipment', subCategory: 'Laptops', location: 'Building A - Floor 2 - Room 201', assignedTo: 'John Doe', value: 1200, status: 'Active', department: 'IT', purchaseDate: '2024-01-15', supplier: 'Dell Technologies' },
  { id: 'AST-002', name: 'HP LaserJet Pro', code: 'IT-PRT-002', category: 'IT Equipment', subCategory: 'Printers', location: 'Building B - Floor 1 - Room 105', assignedTo: 'Sarah Smith', value: 800, status: 'Assigned', department: 'HR', purchaseDate: '2024-02-20', supplier: 'HP Inc' },
  { id: 'AST-003', name: 'iPhone 15 Pro', code: 'ELE-PHN-003', category: 'Electronics', subCategory: 'Phones', location: 'Building A - Floor 3 - Room 302', assignedTo: 'Mike Johnson', value: 999, status: 'Assigned', department: 'Sales', purchaseDate: '2024-03-10', supplier: 'Apple Inc' },
  { id: 'AST-004', name: 'Toyota Camry 2023', code: 'VEH-CAR-004', category: 'Vehicles', subCategory: 'Cars', location: 'Parking Lot A', assignedTo: 'Fleet Manager', value: 35000, status: 'Active', department: 'Transport', purchaseDate: '2023-11-01', supplier: 'Toyota Motors' },
  { id: 'AST-005', name: 'MacBook Pro M3', code: 'IT-LAP-005', category: 'IT Equipment', subCategory: 'Laptops', location: 'Building C - Floor 2 - Room 210', assignedTo: 'Emily Davis', value: 2499, status: 'Under Maintenance', department: 'Design', purchaseDate: '2024-04-05', supplier: 'Apple Inc' },
  { id: 'AST-006', name: 'Server Rack Pro', code: 'IT-SRV-006', category: 'IT Equipment', subCategory: 'Servers', location: 'Data Center', assignedTo: 'IT Team', value: 15000, status: 'Active', department: 'IT', purchaseDate: '2023-06-15', supplier: 'Cisco Systems' },
  { id: 'AST-007', name: 'Office Desk Pro', code: 'FUR-DSK-007', category: 'Furniture', subCategory: 'Desks', location: 'Building A - Floor 1 - Open Space', assignedTo: 'Unassigned', value: 450, status: 'Active', department: 'Admin', purchaseDate: '2024-05-01', supplier: 'IKEA' },
  { id: 'AST-008', name: 'Canon EOS R5', code: 'ELE-CAM-008', category: 'Electronics', subCategory: 'Cameras', location: 'Building B - Floor 3 - Studio', assignedTo: 'Media Team', value: 3899, status: 'Damaged', department: 'Marketing', purchaseDate: '2024-02-14', supplier: 'Canon Inc' },
  { id: 'AST-009', name: 'Projector X300', code: 'ELE-PRJ-009', category: 'Electronics', subCategory: 'Projectors', location: 'Meeting Room A', assignedTo: 'Unassigned', value: 1200, status: 'Active', department: 'IT', purchaseDate: '2024-06-20', supplier: 'Epson' },
  { id: 'AST-010', name: 'Chair Executive', code: 'FUR-CHR-010', category: 'Furniture', subCategory: 'Chairs', location: 'Building A - Floor 2 - Room 205', assignedTo: 'John Doe', value: 850, status: 'Assigned', department: 'IT', purchaseDate: '2024-03-01', supplier: 'Herman Miller' },
]

export const categories = [
  { id: 1, name: 'ICT Equipment', icon: 'Monitor', description: 'Computers, laptops, printers, servers', count: 120 },
  { id: 2, name: 'Furniture', icon: 'Armchair', description: 'Desks, chairs, cabinets, tables', count: 450 },
  { id: 3, name: 'Vehicles', icon: 'Car', description: 'Cars, trucks, vans, motorcycles', count: 35 },
  { id: 4, name: 'Buildings', icon: 'Building2', description: 'Office buildings, warehouses', count: 8 },
  { id: 5, name: 'Electronics', icon: 'Smartphone', description: 'Phones, cameras, projectors', count: 280 },
  { id: 6, name: 'Laboratory Equipment', icon: 'FlaskConical', description: 'Microscopes, test equipment', count: 65 },
]

export const assignments = [
  { id: 1, asset: 'Dell Latitude 5420', assetCode: 'IT-LAP-001', assignedTo: 'John Doe', department: 'IT', date: '2024-06-01', expectedReturn: '2025-06-01', status: 'Active', condition: 'Excellent' },
  { id: 2, asset: 'HP LaserJet Pro', assetCode: 'IT-PRT-002', assignedTo: 'Sarah Smith', department: 'HR', date: '2024-05-15', expectedReturn: '2024-12-15', status: 'Active', condition: 'Good' },
  { id: 3, asset: 'iPhone 15 Pro', assetCode: 'ELE-PHN-003', assignedTo: 'Mike Johnson', department: 'Sales', date: '2024-04-20', expectedReturn: '2025-04-20', status: 'Active', condition: 'Excellent' },
  { id: 4, asset: 'MacBook Pro M3', assetCode: 'IT-LAP-005', assignedTo: 'Emily Davis', department: 'Design', date: '2024-03-10', expectedReturn: '2025-03-10', status: 'Overdue', condition: 'Good' },
  { id: 5, asset: 'Chair Executive', assetCode: 'FUR-CHR-010', assignedTo: 'John Doe', department: 'IT', date: '2024-02-01', expectedReturn: '2025-02-01', status: 'Active', condition: 'Excellent' },
]

export const transfers = [
  { id: 1, asset: 'Dell Latitude 5420', assetCode: 'IT-LAP-001', from: 'ICT Department', fromLocation: 'Room 201 - Building A', to: 'Administration', toLocation: 'Room 105 - Building B', reason: 'Reallocation', date: '2026-06-03', approvedBy: 'Admin', status: 'In Transit', condition: 'Excellent' },
  { id: 2, asset: 'HP LaserJet Pro', assetCode: 'IT-PRT-002', from: 'Administration', fromLocation: 'Room 105 - Building B', to: 'HR Department', toLocation: 'Room 302 - Building A', reason: 'Department Transfer', date: '2026-06-01', approvedBy: 'Manager', status: 'Completed', condition: 'Good' },
  { id: 3, asset: 'MacBook Pro M3', assetCode: 'IT-LAP-005', from: 'Design Department', fromLocation: 'Room 210 - Building C', to: 'ICT Department', toLocation: 'Room 201 - Building A', reason: 'Upgrade', date: '2026-05-28', approvedBy: 'Admin', status: 'Pending', condition: 'Excellent' },
  { id: 4, asset: 'Projector X300', assetCode: 'ELE-PRJ-009', from: 'ICT Department', fromLocation: 'Meeting Room A', to: 'Training Room', toLocation: 'Lab 1 - Building C', reason: 'New Assignment', date: '2026-05-25', approvedBy: 'Director', status: 'Completed', condition: 'Fair' },
  { id: 5, asset: 'Chair Executive', assetCode: 'FUR-CHR-010', from: 'ICT Department', fromLocation: 'Room 205 - Building A', to: 'Administration', toLocation: 'Room 101 - Building A', reason: 'Reallocation', date: '2026-05-20', approvedBy: 'Admin', status: 'Rejected', condition: 'Good' },
  { id: 6, asset: 'Server Rack Pro', assetCode: 'IT-SRV-006', from: 'Data Center', fromLocation: 'Server Room', to: 'Backup Facility', toLocation: 'Warehouse - Storage A', reason: 'Maintenance', date: '2026-06-04', approvedBy: 'Admin', status: 'Pending', condition: 'Excellent' },
]

export const transferTimeline = [
  { transferId: 1, steps: [
    { label: 'Requested', date: '2026-06-03', time: '09:15 AM', user: 'Admin', completed: true },
    { label: 'Approved', date: '2026-06-03', time: '10:00 AM', user: 'Director', completed: true },
    { label: 'In Transit', date: '2026-06-03', time: '02:30 PM', user: 'Logistics', completed: true },
    { label: 'Delivered', date: '', time: '', user: '', completed: false },
    { label: 'Confirmed', date: '', time: '', user: '', completed: false },
  ]},
  { transferId: 2, steps: [
    { label: 'Requested', date: '2026-06-01', time: '08:00 AM', user: 'Admin', completed: true },
    { label: 'Approved', date: '2026-06-01', time: '08:30 AM', user: 'Manager', completed: true },
    { label: 'In Transit', date: '2026-06-01', time: '11:00 AM', user: 'Logistics', completed: true },
    { label: 'Delivered', date: '2026-06-01', time: '03:00 PM', user: 'Logistics', completed: true },
    { label: 'Confirmed', date: '2026-06-02', time: '09:00 AM', user: 'HR Department', completed: true },
  ]},
]

export const maintenanceRecords = [
  { id: 1, asset: 'MacBook Pro M3', problem: 'Battery replacement', technician: 'TechPro Services', cost: 199, date: '2024-07-10', status: 'Ongoing' },
  { id: 2, asset: 'Canon EOS R5', problem: 'Lens calibration', technician: 'Camera Repair Ltd', cost: 350, date: '2024-07-05', status: 'Scheduled' },
  { id: 3, asset: 'Toyota Camry 2023', problem: 'Oil change', technician: 'AutoCare Center', cost: 120, date: '2024-06-28', status: 'Completed' },
  { id: 4, asset: 'Server Rack Pro', problem: 'Cooling fan replacement', technician: 'ServerTech', cost: 450, date: '2024-07-01', status: 'Overdue' },
  { id: 5, asset: 'HP LaserJet Pro', problem: 'Drum replacement', technician: 'HP Care', cost: 89, date: '2024-06-20', status: 'Completed' },
]

export const warranties = [
  { id: 1, asset: 'Dell Latitude 5420', provider: 'Dell Support', startDate: '2024-01-15', endDate: '2027-01-15', status: 'Active', cost: 299 },
  { id: 2, asset: 'MacBook Pro M3', provider: 'AppleCare+', startDate: '2024-04-05', endDate: '2027-04-05', status: 'Active', cost: 349 },
  { id: 3, asset: 'Toyota Camry 2023', provider: 'Toyota Warranty', startDate: '2023-11-01', endDate: '2026-11-01', status: 'Active', cost: 1500 },
  { id: 4, asset: 'Canon EOS R5', provider: 'Canon Care', startDate: '2024-02-14', endDate: '2025-02-14', status: 'Expiring Soon', cost: 199 },
  { id: 5, asset: 'Server Rack Pro', provider: 'Cisco Support', startDate: '2023-06-15', endDate: '2024-06-15', status: 'Expired', cost: 2500 },
]

export const depreciationData = [
  { year: 2024, value: 12400000, depreciation: 1240000, remaining: 11160000 },
  { year: 2025, value: 11160000, depreciation: 1116000, remaining: 10044000 },
  { year: 2026, value: 10044000, depreciation: 1004400, remaining: 9039600 },
  { year: 2027, value: 9039600, depreciation: 903960, remaining: 8135640 },
  { year: 2028, value: 8135640, depreciation: 813564, remaining: 7322076 },
]

export const auditItems = [
  { id: 1, asset: 'Dell Latitude 5420', location: 'Building A - Room 201', verified: true, condition: 'Excellent' },
  { id: 2, asset: 'HP LaserJet Pro', location: 'Building B - Room 105', verified: true, condition: 'Good' },
  { id: 3, asset: 'iPhone 15 Pro', location: 'Building A - Room 302', verified: false, condition: 'Missing' },
  { id: 4, asset: 'Canon EOS R5', location: 'Building B - Studio', verified: true, condition: 'Damaged' },
  { id: 5, asset: 'Server Rack Pro', location: 'Data Center', verified: true, condition: 'Excellent' },
]

export const lostDamaged = [
  { id: 1, asset: 'iPhone 15 Pro', type: 'Lost', reportedBy: 'Mike Johnson', date: '2024-07-08', reason: 'Misplaced during travel', recovery: 'Under Investigation' },
  { id: 2, asset: 'Canon EOS R5', type: 'Damaged', reportedBy: 'Media Team', date: '2024-07-05', reason: 'Dropped during shoot', recovery: 'Sent for Repair' },
  { id: 3, asset: 'Projector X300', type: 'Stolen', reportedBy: 'IT Team', date: '2024-06-20', reason: 'Break-in at meeting room', recovery: 'Police Report Filed' },
  { id: 4, asset: 'Old Server', type: 'Destroyed', reportedBy: 'Admin', date: '2024-06-01', reason: 'Fire incident', recovery: 'Insurance Claim' },
]

export const disposals = [
  { id: 1, asset: 'Old Server Rack', type: 'Scrap', reason: 'End of life', value: 500, date: '2024-07-01', status: 'Approved' },
  { id: 2, asset: 'Chairs Bundle', type: 'Donation', reason: 'Upgraded furniture', value: 0, date: '2024-06-15', status: 'Pending Manager' },
  { id: 3, asset: 'Printer HP 2015', type: 'Sale', reason: 'Replaced with newer model', value: 200, date: '2024-06-10', status: 'Pending Finance' },
  { id: 4, asset: 'Desktop Bundle', type: 'Write Off', reason: 'Outdated specs', value: 0, date: '2024-05-20', status: 'Approved' },
]

export const notifications = [
  { id: 1, type: 'maintenance', message: 'MacBook Pro M3 maintenance due in 3 days', date: '2024-07-12', read: false },
  { id: 2, type: 'warranty', message: 'Canon EOS R5 warranty expiring in 30 days', date: '2024-07-10', read: false },
  { id: 3, type: 'return', message: 'iPhone 15 Pro return overdue by 5 days', date: '2024-07-08', read: false },
  { id: 4, type: 'transfer', message: 'Asset transfer request from IT to HR pending', date: '2024-07-07', read: true },
  { id: 5, type: 'audit', message: 'Quarterly audit scheduled for next week', date: '2024-07-05', read: true },
]

export const employees = [
  { id: 1, name: 'John Doe', department: 'IT', role: 'Developer', email: 'john@company.com' },
  { id: 2, name: 'Sarah Smith', department: 'HR', role: 'Manager', email: 'sarah@company.com' },
  { id: 3, name: 'Mike Johnson', department: 'Sales', role: 'Executive', email: 'mike@company.com' },
  { id: 4, name: 'Emily Davis', department: 'Design', role: 'Designer', email: 'emily@company.com' },
  { id: 5, name: 'Robert Wilson', department: 'Finance', role: 'Accountant', email: 'robert@company.com' },
  { id: 6, name: 'Alice Brown', department: 'ICT', role: 'Technician', email: 'alice@company.com' },
  { id: 7, name: 'David Lee', department: 'Administration', role: 'Officer', email: 'david@company.com' },
  { id: 8, name: 'Grace Kim', department: 'Teaching Staff', role: 'Teacher', email: 'grace@company.com' },
  { id: 9, name: 'Frank Okafor', department: 'Maintenance', role: 'Supervisor', email: 'frank@company.com' },
  { id: 10, name: 'Helen Muller', department: 'Finance', role: 'Auditor', email: 'helen@company.com' },
]

export const staffList = [
  { id: 1, name: 'John Doe', department: 'ICT', role: 'Developer' },
  { id: 2, name: 'Sarah Smith', department: 'Administration', role: 'Manager' },
  { id: 3, name: 'Mike Johnson', department: 'Finance', role: 'Accountant' },
  { id: 4, name: 'Emily Davis', department: 'Teaching Staff', role: 'Teacher' },
  { id: 5, name: 'Robert Wilson', department: 'Maintenance', role: 'Supervisor' },
  { id: 6, name: 'Alice Brown', department: 'ICT', role: 'Technician' },
  { id: 7, name: 'David Lee', department: 'Administration', role: 'Officer' },
  { id: 8, name: 'Grace Kim', department: 'Teaching Staff', role: 'Senior Teacher' },
  { id: 9, name: 'Frank Okafor', department: 'Maintenance', role: 'Technician' },
  { id: 10, name: 'Helen Muller', department: 'Finance', role: 'Auditor' },
]

export const rooms = [
  { id: 1, building: 'Building A', floor: 'Floor 1', room: 'Room 101', label: 'A-1-101' },
  { id: 2, building: 'Building A', floor: 'Floor 1', room: 'Room 102', label: 'A-1-102' },
  { id: 3, building: 'Building A', floor: 'Floor 2', room: 'Room 201', label: 'A-2-201' },
  { id: 4, building: 'Building A', floor: 'Floor 2', room: 'Room 202', label: 'A-2-202' },
  { id: 5, building: 'Building B', floor: 'Floor 1', room: 'Room 105', label: 'B-1-105' },
  { id: 6, building: 'Building B', floor: 'Floor 2', room: 'Room 210', label: 'B-2-210' },
  { id: 7, building: 'Building C', floor: 'Floor 1', room: 'Lab 1', label: 'C-1-Lab1' },
  { id: 8, building: 'Building C', floor: 'Floor 2', room: 'Lab 2', label: 'C-2-Lab2' },
  { id: 9, building: 'Data Center', floor: 'Ground', room: 'Server Room', label: 'DC-G-SR' },
  { id: 10, building: 'Warehouse', floor: 'Ground', room: 'Storage A', label: 'WH-G-SA' },
]

export const departments = ['ICT', 'Administration', 'Finance', 'Teaching Staff', 'Maintenance']

export const analyticsKPIs = [
  { label: 'Total Asset Value', value: '$12.4M', change: '+12.5%', icon: 'DollarSign', color: 'from-amber-400 to-amber-600' },
  { label: 'Total Assets', value: '2,847', change: '+8.2%', icon: 'Boxes', color: 'from-navy to-navy/80' },
  { label: 'Depreciation YTD', value: '$1.24M', change: '-3.1%', icon: 'TrendingDown', color: 'from-red-400 to-red-600' },
  { label: 'Maintenance Cost', value: '$284K', change: '+5.7%', icon: 'Wrench', color: 'from-purple-400 to-purple-600' },
  { label: 'Under Maintenance', value: '156', change: '-2.4%', icon: 'Clock', color: 'from-amber-300 to-amber-500' },
  { label: 'Healthy Assets', value: '78%', change: '+4.1%', icon: 'Heart', color: 'from-emerald-400 to-emerald-600' },
]

export const valueOverTimeData = [
  { year: '2019', value: 4200000, acquisition: 520000 },
  { year: '2020', value: 5100000, acquisition: 680000 },
  { year: '2021', value: 6300000, acquisition: 850000 },
  { year: '2022', value: 8200000, acquisition: 1100000 },
  { year: '2023', value: 10100000, acquisition: 1450000 },
  { year: '2024', value: 12400000, acquisition: 1800000 },
  { year: '2025', value: 14200000, acquisition: 2100000 },
  { year: '2026', value: 15800000, acquisition: 2300000 },
]

export const depreciationTrendData = [
  { year: '2019', straightLine: 420000, diminishing: 580000, doubleDeclining: 720000 },
  { year: '2020', straightLine: 510000, diminishing: 650000, doubleDeclining: 810000 },
  { year: '2021', straightLine: 630000, diminishing: 740000, doubleDeclining: 920000 },
  { year: '2022', straightLine: 820000, diminishing: 890000, doubleDeclining: 1100000 },
  { year: '2023', straightLine: 1010000, diminishing: 1050000, doubleDeclining: 1280000 },
  { year: '2024', straightLine: 1240000, diminishing: 1200000, doubleDeclining: 1450000 },
  { year: '2025', straightLine: 1420000, diminishing: 1350000, doubleDeclining: 1620000 },
  { year: '2026', straightLine: 1580000, diminishing: 1480000, doubleDeclining: 1780000 },
]

export const maintenanceFrequencyData = [
  { category: 'ICT Equipment', frequency: 42, cost: 84500 },
  { category: 'Furniture', frequency: 18, cost: 32000 },
  { category: 'Vehicles', frequency: 35, cost: 128000 },
  { category: 'Electronics', frequency: 28, cost: 56000 },
  { category: 'Buildings', frequency: 12, cost: 95000 },
  { category: 'Lab Equipment', frequency: 22, cost: 48000 },
]

export const users = [
  { id: 1, name: 'Admin User', email: 'admin@assetmgmt.com', role: 'Super Admin', status: 'Active' },
  { id: 2, name: 'John Manager', email: 'john@assetmgmt.com', role: 'Asset Manager', status: 'Active' },
  { id: 3, name: 'Sarah Accountant', email: 'sarah@assetmgmt.com', role: 'Accountant', status: 'Active' },
  { id: 4, name: 'Mike Auditor', email: 'mike@assetmgmt.com', role: 'Auditor', status: 'Active' },
  { id: 5, name: 'Emily Tech', email: 'emily@assetmgmt.com', role: 'Technician', status: 'Active' },
]
