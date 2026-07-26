import { useMemo, useState } from 'react';
import {
  ModernDataTable,
  SingleStepForm,
  MultiStepForm,
  FormField,
  FormInput,
  FormSelect,
  FormDateInput,
  FormRadioGroup,
  FormCheckbox,
  FormToggle,
  FormFileUpload,
  StatusBadge,
  ClassBadge,
  FormAlert,
  BtnPrimary,
  BtnSecondary,
} from './index';

const SAMPLE_STUDENTS = [
  { id: 'STD-0001', fullName: 'Ishimwe Sarah', className: 'S6 Science A', classTone: 'blue', gender: 'Female', dob: '2008-03-12', status: 'Active', guardian: 'Jean Ishimwe' },
  { id: 'STD-0002', fullName: 'Mugisha Uwizeye', className: 'S5 Economics B', classTone: 'green', gender: 'Male', dob: '2009-07-22', status: 'Active', guardian: 'Claire Mugisha' },
  { id: 'STD-0003', fullName: 'Keza Aline', className: 'S4 General', classTone: 'yellow', gender: 'Female', dob: '2010-01-05', status: 'Inactive', guardian: 'Paul Keza' },
  { id: 'STD-0004', fullName: 'Niyonsaba Eric', className: 'S6 Science A', classTone: 'blue', gender: 'Male', dob: '2008-11-18', status: 'Pending', guardian: 'Grace Niyonsaba' },
  { id: 'STD-0005', fullName: 'Uwimana Divine', className: 'S5 Economics B', classTone: 'green', gender: 'Female', dob: '2009-09-30', status: 'Active', guardian: 'Emmanuel Uwimana' },
];

const TABLE_COLUMNS = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'fullName', label: 'Full Name', sortable: true, type: 'avatar-name' },
  { key: 'className', label: 'Class', sortable: true, type: 'class-badge', badgeTone: (row) => row.classTone },
  { key: 'gender', label: 'Gender', sortable: true },
  { key: 'dob', label: 'Date of Birth', sortable: true },
  { key: 'status', label: 'Status', sortable: true, type: 'status-badge' },
  { key: 'guardian', label: 'Guardian', sortable: true },
];

function sortRows(rows, key, dir) {
  const sorted = [...rows].sort((a, b) => {
    const av = a[key] ?? '';
    const bv = b[key] ?? '';
    return String(av).localeCompare(String(bv), undefined, { numeric: true });
  });
  return dir === 'desc' ? sorted.reverse() : sorted;
}

/** Live demo — import this page on any dev route to preview Modern UI components */
export default function ModernUiDemo() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [sortKey, setSortKey] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [employee, setEmployee] = useState({
    fullName: '',
    email: '',
    phone: '',
    department: '',
    jobTitle: '',
    employmentType: '',
    status: 'Active',
    dateOfJoining: '',
  });

  const [student, setStudent] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    gender: 'Female',
    nationality: 'Rwandan',
    className: '',
    status: 'Active',
    guardianName: '',
    guardianPhone: '',
  });

  const [toggleOn, setToggleOn] = useState(true);
  const [checkboxOn, setCheckboxOn] = useState(true);

  const sorted = useMemo(() => sortRows(SAMPLE_STUDENTS, sortKey, sortDir), [sortKey, sortDir]);
  const total = 1254;
  const pagedRows = sorted;

  const studentSteps = [
    {
      id: 'basic',
      title: 'Basic Information',
      description: 'Student personal info',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="First Name" required>
            <FormInput
              value={student.firstName}
              onChange={(e) => setStudent((s) => ({ ...s, firstName: e.target.value }))}
              placeholder="First name"
            />
          </FormField>
          <FormField label="Last Name" required>
            <FormInput
              value={student.lastName}
              onChange={(e) => setStudent((s) => ({ ...s, lastName: e.target.value }))}
              placeholder="Last name"
            />
          </FormField>
          <FormField label="Date of Birth" required>
            <FormDateInput
              value={student.dob}
              onChange={(e) => setStudent((s) => ({ ...s, dob: e.target.value }))}
            />
          </FormField>
          <FormField label="Gender" required>
            <FormRadioGroup
              name="gender"
              value={student.gender}
              onChange={(v) => setStudent((s) => ({ ...s, gender: v }))}
              options={[
                { value: 'Female', label: 'Female' },
                { value: 'Male', label: 'Male' },
              ]}
            />
          </FormField>
          <FormField label="Nationality" className="md:col-span-2">
            <FormSelect
              value={student.nationality}
              onChange={(e) => setStudent((s) => ({ ...s, nationality: e.target.value }))}
            >
              <option value="Rwandan">Rwandan</option>
              <option value="Other">Other</option>
            </FormSelect>
          </FormField>
        </div>
      ),
    },
    {
      id: 'academic',
      title: 'Academic Info',
      description: 'Class and enrollment status',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Class" required>
            <FormSelect
              value={student.className}
              onChange={(e) => setStudent((s) => ({ ...s, className: e.target.value }))}
            >
              <option value="">Select class</option>
              <option value="S6 Science A">S6 Science A</option>
              <option value="S5 Economics B">S5 Economics B</option>
              <option value="S4 General">S4 General</option>
            </FormSelect>
          </FormField>
          <FormField label="Status" required>
            <FormSelect
              value={student.status}
              onChange={(e) => setStudent((s) => ({ ...s, status: e.target.value }))}
            >
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Inactive">Inactive</option>
            </FormSelect>
          </FormField>
        </div>
      ),
    },
    {
      id: 'guardian',
      title: 'Guardian Info',
      description: 'Parent or guardian contact',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Guardian Name" required>
            <FormInput
              value={student.guardianName}
              onChange={(e) => setStudent((s) => ({ ...s, guardianName: e.target.value }))}
              placeholder="Full name"
            />
          </FormField>
          <FormField label="Guardian Phone" required>
            <FormInput
              value={student.guardianPhone}
              onChange={(e) => setStudent((s) => ({ ...s, guardianPhone: e.target.value }))}
              placeholder="+250 ..."
            />
          </FormField>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-6 md:p-10 space-y-10">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-[#000435]/45">Modern UI Kit</p>
        <h1 className="text-2xl font-bold text-[#000435] mt-1">Table & Forms</h1>
        <p className="text-sm text-[#000435]/55 mt-1 max-w-2xl">
          Reusable components matching the reference designs — data table, single-step form, and multi-step wizard.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#000435]/60">Data Table</h2>
        <ModernDataTable
          columns={TABLE_COLUMNS}
          rows={pagedRows}
          getRowId={(r) => r.id}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          sortKey={sortKey}
          sortDirection={sortDir}
          onSort={(key, dir) => {
            setSortKey(key);
            setSortDir(dir);
          }}
          pagination={{
            page,
            pageSize,
            total,
            onPageChange: setPage,
            onPageSizeChange: (n) => {
              setPageSize(n);
              setPage(1);
            },
            pageSizeOptions: [5, 10, 25],
          }}
          onView={(row) => console.log('view', row)}
          onEdit={(row) => console.log('edit', row)}
          onMore={(row) => console.log('more', row)}
        />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#000435]/60">Single-Step Form</h2>
          <SingleStepForm
            title="Add New Employee"
            subtitle="Fill in the employee details below."
            submitLabel="Save Employee"
            onSubmit={() => console.log('employee', employee)}
            onCancel={() => setEmployee({
              fullName: '', email: '', phone: '', department: '', jobTitle: '', employmentType: '', status: 'Active', dateOfJoining: '',
            })}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField label="Full Name" required>
                <FormInput
                  value={employee.fullName}
                  onChange={(e) => setEmployee((s) => ({ ...s, fullName: e.target.value }))}
                  placeholder="Full name"
                />
              </FormField>
              <FormField label="Email" required>
                <FormInput
                  type="email"
                  value={employee.email}
                  onChange={(e) => setEmployee((s) => ({ ...s, email: e.target.value }))}
                  placeholder="email@school.rw"
                />
              </FormField>
              <FormField label="Phone Number">
                <FormInput
                  value={employee.phone}
                  onChange={(e) => setEmployee((s) => ({ ...s, phone: e.target.value }))}
                  placeholder="+250 ..."
                />
              </FormField>
              <FormField label="Department" required>
                <FormSelect
                  value={employee.department}
                  onChange={(e) => setEmployee((s) => ({ ...s, department: e.target.value }))}
                >
                  <option value="">Select</option>
                  <option value="Academic">Academic</option>
                  <option value="Administration">Administration</option>
                  <option value="Finance">Finance</option>
                </FormSelect>
              </FormField>
              <FormField label="Job Title">
                <FormInput
                  value={employee.jobTitle}
                  onChange={(e) => setEmployee((s) => ({ ...s, jobTitle: e.target.value }))}
                  placeholder="Job title"
                />
              </FormField>
              <FormField label="Employment Type">
                <FormSelect
                  value={employee.employmentType}
                  onChange={(e) => setEmployee((s) => ({ ...s, employmentType: e.target.value }))}
                >
                  <option value="">Select</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                </FormSelect>
              </FormField>
              <FormField label="Date of Joining">
                <FormDateInput
                  value={employee.dateOfJoining}
                  onChange={(e) => setEmployee((s) => ({ ...s, dateOfJoining: e.target.value }))}
                />
              </FormField>
              <FormField label="Status">
                <FormSelect
                  value={employee.status}
                  onChange={(e) => setEmployee((s) => ({ ...s, status: e.target.value }))}
                >
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Inactive">Inactive</option>
                </FormSelect>
              </FormField>
            </div>
            <div className="mt-4">
              <FormFileUpload label="Profile Picture" />
            </div>
          </SingleStepForm>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#000435]/60">Multi-Step Form</h2>
          <MultiStepForm
            title="Add New Student"
            subtitle="Complete all steps to register a student."
            steps={studentSteps}
            submitLabel="Register Student"
            onComplete={() => console.log('student', student)}
            onCancel={() => setStudent({
              firstName: '', lastName: '', dob: '', gender: 'Female', nationality: 'Rwandan',
              className: '', status: 'Active', guardianName: '', guardianPhone: '',
            })}
          />
        </section>
      </div>

      <section className="rounded-2xl border border-black/[0.06] bg-white shadow-sm p-6 space-y-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#000435]/60">Form Elements</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="Input">
            <FormInput placeholder="Text input" />
          </FormField>
          <FormField label="Select">
            <FormSelect>
              <option>Option 1</option>
              <option>Option 2</option>
            </FormSelect>
          </FormField>
          <FormField label="Date Picker">
            <FormDateInput />
          </FormField>
          <div className="space-y-3">
            <FormCheckbox id="demo-cb" label="Checkbox" checked={checkboxOn} onChange={setCheckboxOn} />
            <FormRadioGroup
              name="demo-radio"
              value="1"
              onChange={() => {}}
              options={[{ value: '1', label: 'Option 1' }, { value: '2', label: 'Option 2' }]}
            />
            <FormToggle checked={toggleOn} onChange={setToggleOn} label="Toggle" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <BtnPrimary>Primary Button</BtnPrimary>
          <BtnSecondary>Secondary</BtnSecondary>
          <StatusBadge status="Active" variant="active" />
          <StatusBadge status="Pending" variant="pending" />
          <ClassBadge label="S6 Science A" tone="blue" />
        </div>
        <FormAlert type="success" message="Record saved successfully." onClose={() => {}} />
      </section>
    </div>
  );
}
