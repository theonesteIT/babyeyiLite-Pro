const fs = require('fs');

const rawData = fs.readFileSync('c:/Users/HP/Documents/ny/babyeyiLite-Pro-main/wisdom_passport_pic/Students_Complete_List (1) (1).json', 'utf8');
const validJsonString = rawData.replace(/NaN/g, 'null');
const inputList = JSON.parse(validJsonString);

const transformedStudents = inputList.students.map(student => ({
  student_name: student.Name,
  class: student.Class,
  pic_id: student.Number,
  flag: student.Status.includes('Confirmed') ? 'confirmed' : 'flagged'
}));

const output = {
  total: transformedStudents.length,
  students: transformedStudents,
  flag_summary: {
    confirmed: transformedStudents.filter(s => s.flag === 'confirmed').length,
    flagged: transformedStudents.filter(s => s.flag === 'flagged').length,
    total: transformedStudents.length
  }
};

fs.writeFileSync('c:/Users/HP/Documents/ny/babyeyiLite-Pro-main/BabyeyiSystem/backend/input-students.json', JSON.stringify(output, null, 2));

console.log(`Transformed ${transformedStudents.length} students into input-students.json`);
