export const exportTimetablePDF = async (timetable, days, periods, selectedClass = '') => {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = 297, margin = 14;
    
    // Theme: Navy Blue #1E3A5F & Gold #FEBF10 from the platform
    const themeRGB = [30, 58, 95];
    const themeGold = [254, 191, 16];
    
    let pageNum = 1;

    // Standard Header Footer System running on jsPDF autoTable page hooks
    const drawPageChrome = (data) => {
        if (data && data.pageNumber !== pageNum) {
            pageNum = data.pageNumber;
        }

        // Header Background Solid Color Plate
        doc.setFillColor(...themeRGB);
        doc.rect(0, 0, W, 18, 'F');
        
        doc.setTextColor(...themeGold);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('BABYEYI SYSTEM', margin, 11);
        
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'normal');
        const headerTitle = selectedClass ? `CLASSROOM TIMETABLE: ${selectedClass.toUpperCase()}` : 'FACULTY SCHEDULE REPORTS';
        doc.text(headerTitle, W / 2, 11, { align: 'center' });
        doc.text(`Page ${pageNum}`, W - margin, 11, { align: 'right' });

        // Sticky Footer
        doc.setFillColor(...themeRGB);
        doc.rect(0, 195, W, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.text(`SMART EDUCATION PLATFORM  ·  CONFIDENTIAL SCHEDULE EXPORT`, margin, 203);
    };

    // Construct the Table Headers (Columns mapping to Periods)
    const tableHeaders = ['DAY'];
    periods.forEach(p => {
        if (p.is_break) {
            tableHeaders.push(`BREAK\n${p.start_time.substring(0,5)}`);
        } else {
            tableHeaders.push(`${p.period_name.toUpperCase()}\n${p.start_time.substring(0,5)}`);
        }
    });

    const drawIndividualTimetable = (title, subLabel, rowLessons, startY) => {
        doc.setTextColor(...themeRGB);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(title.toUpperCase(), margin, startY);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(subLabel, margin, startY + 4);

        // Prep structural table data mapped to classic grid coordinates
        const tableData = [];
        days.forEach(day => {
            const row = [day.toUpperCase()];
            periods.forEach(p => {
                if (p.is_break) {
                    row.push('---');
                } else {
                    // Match the precise lesson block intersecting the day and period timeframe
                    const l = rowLessons.find(lesson => lesson.day === day && lesson.time.includes(p.start_time.substring(0,5)));
                    if (l) {
                        const tag = selectedClass ? l.teacherName : l.group;
                        row.push(`${l.subject.toUpperCase()}\n[ ${tag} ]`);
                    } else {
                        row.push(''); // Clean Empty Slot
                    }
                }
            });
            tableData.push(row);
        });

        autoTable(doc, {
            startY: startY + 6,
            head: [tableHeaders],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: themeRGB,
                textColor: 255,
                fontSize: 7,
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle',
                cellPadding: 2,
                lineColor: [20, 40, 70],
                lineWidth: 0.1
            },
            bodyStyles: {
                fontSize: 6.5,
                halign: 'center',
                valign: 'middle',
                cellPadding: 3,
                textColor: [30, 58, 95],
                lineColor: [210, 220, 230] // Soft cell borders
            },
            columnStyles: {
                0: { fontStyle: 'bold', halign: 'left', fillColor: [244, 248, 252], textColor: themeRGB }
            },
            didDrawPage: drawPageChrome,
            margin: { top: 25, bottom: 20, left: margin, right: margin }
        });
    };

    // Execution Router Strategy
    if (selectedClass) {
        // Mode 1: Class Perspective (1 massive detailed table spanning the page)
        let classLessons = [];
        timetable.forEach(teacher => {
            const matchingLessons = (teacher.lessons || []).filter(l => selectedClass.includes(l.group));
            matchingLessons.forEach(l => {
                classLessons.push({ ...l, teacherName: teacher.teacher });
            });
        });
        
        drawIndividualTimetable(`Class Schedule: ${selectedClass}`, `Academic Capacity: ${classLessons.length} Assigned Periods`, classLessons, 30);
    } else {
        // Mode 2: Master Faculty View (A loop creating individual real-world tables for every staff member!)
        let currY = 30; // Initial Top Margin Anchor
        
        timetable.forEach((teacherData, index) => {
            const lessons = teacherData.lessons || [];
            
            // Layout Calculation Check: If drawing another grid drops us below ~100mm, we must add a fresh leaf.
            // On a 210mm A4, a normal 8-period table takes about ~60mm in height.
            if (currY > 105 && index > 0) {
                doc.addPage();
                currY = 30; 
            }
            
            drawIndividualTimetable(`Faculty Schedule: ${teacherData.teacher}`, `Assigned Load: ${teacherData.load} Standard Blocks`, lessons, currY);
            
            // Using jspdf-autotable's internal cursor location data to dynamically stack the next table safely below it
            currY = doc.lastAutoTable.finalY + 16;
        });
    }

    doc.autoPrint();
    const blob = doc.output('blob');
    if (blob) {
         window.open(URL.createObjectURL(blob), '_blank');
    }
};
