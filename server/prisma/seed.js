import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Starting Database Seeding...");

    // 1. Clear existing data in reverse order of foreign key dependencies
    await prisma.finePayment.deleteMany({});
    await prisma.fine.deleteMany({});
    await prisma.issuedBook.deleteMany({});
    await prisma.borrowHistory.deleteMany({});
    await prisma.bookReservation.deleteMany({});
    await prisma.bookAvailability.deleteMany({});
    await prisma.book.deleteMany({});
    await prisma.announcement.deleteMany({});
    await prisma.student.deleteMany({});
    await prisma.librarian.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.otp.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.department.deleteMany({});
    await prisma.shelf.deleteMany({});
    await prisma.status.deleteMany({});
    await prisma.fineType.deleteMany({});
    await prisma.libraryConstants.deleteMany({});

    console.log("🧹 Cleared existing records.");

    // 2. Categories
    const categoriesData = [
        { name: "Computer Science" },
        { name: "Software Engineering" },
        { name: "Data Science & AI" },
        { name: "Mechanical Engineering" },
        { name: "Electrical Engineering" },
        { name: "Civil Engineering" },
        { name: "Mathematics" },
        { name: "Physics" },
        { name: "Management Studies" },
        { name: "Literature & Fiction" }
    ];

    const categories = [];
    for (const cat of categoriesData) {
        const created = await prisma.category.create({ data: cat });
        categories.push(created);
    }
    console.log(`✅ Seeded ${categories.length} Categories.`);

    // 3. Departments
    const departmentsData = [
        { name: "Computer Science & Engineering" },
        { name: "Information Technology" },
        { name: "Mechanical Engineering" },
        { name: "Electrical & Electronics Engineering" },
        { name: "Civil Engineering" },
        { name: "Management Studies" },
        { name: "Applied Sciences" }
    ];

    const departments = [];
    for (const dep of departmentsData) {
        const created = await prisma.department.create({ data: dep });
        departments.push(created);
    }
    console.log(`✅ Seeded ${departments.length} Departments.`);

    // 4. Shelves
    const shelvesData = [
        { section: "Section A (CS & IT)", rackNumber: "A1" },
        { section: "Section A (CS & IT)", rackNumber: "A2" },
        { section: "Section A (CS & IT)", rackNumber: "A3" },
        { section: "Section B (Mechanical)", rackNumber: "B1" },
        { section: "Section B (Mechanical)", rackNumber: "B2" },
        { section: "Section C (Electrical)", rackNumber: "C1" },
        { section: "Section D (Civil)", rackNumber: "D1" },
        { section: "Section E (Sciences & Math)", rackNumber: "E1" },
        { section: "Section F (Management)", rackNumber: "F1" },
        { section: "Section G (Literature)", rackNumber: "G1" }
    ];

    const shelves = [];
    for (const sh of shelvesData) {
        const created = await prisma.shelf.create({ data: sh });
        shelves.push(created);
    }
    console.log(`✅ Seeded ${shelves.length} Shelves.`);

    // 5. Statuses
    const statusesData = [
        { status: "Available" },
        { status: "Reserved" },
        { status: "Issued" },
        { status: "Cancelled" },
        { status: "Completed" }
    ];
    for (const st of statusesData) {
        await prisma.status.create({ data: st });
    }
    console.log("✅ Seeded Statuses.");

    // 6. Fine Types
    const fineTypesData = [
        { type: "Overdue Return" },
        { type: "Book Damage" },
        { type: "Lost Book" },
        { type: "Late Renewal" }
    ];
    for (const ft of fineTypesData) {
        await prisma.fineType.create({ data: ft });
    }
    console.log("✅ Seeded Fine Types.");

    // 7. Library Constants
    await prisma.libraryConstants.create({
        data: {
            maxBorrowDays: 14,
            maxBooksPerStudent: 3,
            overdueFinePerDay: 5.00,
            maxRenewals: 2,
            renewalExtendsDays: 7
        }
    });
    console.log("✅ Seeded Library Constants.");

    // 8. Test Users (Student & Librarian)
    const hashedPassword = await bcrypt.hash("Password123!", 10);

    const studentUser = await prisma.user.create({
        data: {
            email: "student@example.com",
            username: "John Student",
            role: "STUDENT",
            passwordHash: hashedPassword,
            student: {
                create: {
                    rollNo: "21CS001",
                    department: "Computer Science & Engineering",
                    yearOfStudy: 3
                }
            }
        }
    });

    const librarianUser = await prisma.user.create({
        data: {
            email: "librarian@example.com",
            username: "Alice Librarian",
            role: "LIBRARIAN",
            passwordHash: hashedPassword,
            librarian: {
                create: {
                    staffId: "LIB101"
                }
            }
        }
    });
    console.log("✅ Seeded Test Users (Student: student@example.com, Librarian: librarian@example.com).");

    // 9. Real World Books (100 Books Data List)
    const rawBooks = [
        // Computer Science & Software Engineering
        { title: "Clean Code: A Handbook of Agile Software Craftsmanship", author: "Robert C. Martin", isbn: "9780132350884", category: "Software Engineering", dept: "Computer Science & Engineering", year: 2008, desc: "Even bad code can function. But if code isn't clean, it can bring a development organization to its knees." },
        { title: "Introduction to Algorithms, 4th Edition", author: "Thomas H. Cormen, Charles E. Leiserson", isbn: "9780262046305", category: "Computer Science", dept: "Computer Science & Engineering", year: 2022, desc: "Comprehensive reference and textbook on data structures and algorithms." },
        { title: "Design Patterns: Elements of Reusable Object-Oriented Software", author: "Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides", isbn: "9780201633610", category: "Software Engineering", dept: "Computer Science & Engineering", year: 1994, desc: "Captures a wealth of experience in designing reusable object-oriented software." },
        { title: "The Pragmatic Programmer: Your Journey to Mastery", author: "Andrew Hunt, David Thomas", isbn: "9780135957059", category: "Software Engineering", dept: "Computer Science & Engineering", year: 2019, desc: "One of the most beloved computer science books of all time." },
        { title: "Structure and Interpretation of Computer Programs", author: "Harold Abelson, Gerald Jay Sussman", isbn: "9780262510875", category: "Computer Science", dept: "Computer Science & Engineering", year: 1996, desc: "Fundamental principles of computer programming using Lisp/Scheme." },
        { title: "Artificial Intelligence: A Modern Approach, 4th Edition", author: "Stuart Russell, Peter Norvig", isbn: "9780134610993", category: "Data Science & AI", dept: "Computer Science & Engineering", year: 2020, desc: "The standard textbook in artificial intelligence." },
        { title: "Operating System Concepts", author: "Abraham Silberschatz, Peter B. Galvin, Greg Gagne", isbn: "9781119800361", category: "Computer Science", dept: "Computer Science & Engineering", year: 2018, desc: "Fundamental concepts of operating system design and architecture." },
        { title: "Database System Concepts, 7th Edition", author: "Abraham Silberschatz, Henry F. Korth", isbn: "9780078022159", category: "Computer Science", dept: "Computer Science & Engineering", year: 2019, desc: "Principles of database system construction, architecture, and query optimization." },
        { title: "Computer Networking: A Top-Down Approach", author: "James F. Kurose, Keith W. Ross", isbn: "9780136681557", category: "Computer Science", dept: "Information Technology", year: 2020, desc: "Comprehensive overview of computer networking layer by layer." },
        { title: "Designing Data-Intensive Applications", author: "Martin Kleppmann", isbn: "9781449373320", category: "Software Engineering", dept: "Information Technology", year: 2017, desc: "Deep dive into distributed systems, storage engines, and data processing architecture." },
        { title: "You Don't Know JS Yet: Get Started", author: "Kyle Simpson", isbn: "9781838030605", category: "Software Engineering", dept: "Information Technology", year: 2020, desc: "In-depth guide to JavaScript core mechanics." },
        { title: "Refactoring: Improving the Design of Existing Code", author: "Martin Fowler", isbn: "9780134757599", category: "Software Engineering", dept: "Computer Science & Engineering", year: 2018, desc: "Guide to improving the structural design of existing codebases without changing external behavior." },
        { title: "Head First Design Patterns", author: "Eric Freeman, Elisabeth Robson", isbn: "9781492078005", category: "Software Engineering", dept: "Computer Science & Engineering", year: 2020, desc: "Visually rich, brain-friendly guide to design patterns." },
        { title: "Clean Architecture: A Craftsman's Guide to Software Structure", author: "Robert C. Martin", isbn: "9780134494166", category: "Software Engineering", dept: "Computer Science & Engineering", year: 2017, desc: "Essential rules for software architecture and structural organization." },
        { title: "Compilers: Principles, Techniques, and Tools", author: "Alfred V. Aho, Monica S. Lam, Ravi Sethi, Jeffrey D. Ullman", isbn: "9780321486813", category: "Computer Science", dept: "Computer Science & Engineering", year: 2006, desc: "The iconic Dragon Book on compiler design." },
        { title: "Deep Learning", author: "Ian Goodfellow, Yoshua Bengio, Aaron Courville", isbn: "9780262035613", category: "Data Science & AI", dept: "Computer Science & Engineering", year: 2016, desc: "Comprehensive textbook covering mathematical principles and modern deep neural networks." },
        { title: "Python Crash Course, 3rd Edition", author: "Eric Matthes", isbn: "9781718502703", category: "Computer Science", dept: "Information Technology", year: 2023, desc: "Hands-on, project-based introduction to programming in Python." },
        { title: "Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow", author: "Aurélien Géron", isbn: "9781098125974", category: "Data Science & AI", dept: "Computer Science & Engineering", year: 2022, desc: "Practical guide to building intelligent machine learning models." },
        { title: "Cracking the Coding Interview", author: "Gayle Laakmann McDowell", isbn: "9780984782857", category: "Computer Science", dept: "Computer Science & Engineering", year: 2015, desc: "189 programming questions and solutions for software engineering interviews." },
        { title: "Computer Architecture: A Quantitative Approach", author: "John L. Hennessy, David A. Patterson", isbn: "9780128119051", category: "Computer Science", dept: "Computer Science & Engineering", year: 2017, desc: "The definitive guide to computer system design and hardware performance." },

        // Mathematics & Applied Sciences
        { title: "Calculus, 4th Edition", author: "Michael Spivak", isbn: "9780914098911", category: "Mathematics", dept: "Applied Sciences", year: 2008, desc: "Classic rigorous introduction to single variable calculus and real analysis." },
        { title: "Linear Algebra and Its Applications", author: "Gilbert Strang", isbn: "9780030105678", category: "Mathematics", dept: "Applied Sciences", year: 2006, desc: "Clear, insightful text on linear algebra matrices and applications." },
        { title: "Probability and Statistics for Engineers", author: "Richard A. Johnson", isbn: "9780134115856", category: "Mathematics", dept: "Applied Sciences", year: 2016, desc: "Statistical theory and applications in engineering problems." },
        { title: "Discrete Mathematics and Its Applications", author: "Kenneth H. Rosen", isbn: "9781259676512", category: "Mathematics", dept: "Computer Science & Engineering", year: 2018, desc: "Fundamental discrete structures for computer science." },
        { title: "Physics for Scientists and Engineers", author: "Raymond A. Serway, John W. Jewett", isbn: "9781337553292", category: "Physics", dept: "Applied Sciences", year: 2018, desc: "Comprehensive calculus-based physics textbook covering mechanics and electromagnetism." },
        { title: "University Physics with Modern Physics", author: "Hugh D. Young, Roger A. Freedman", isbn: "9780135159552", category: "Physics", dept: "Applied Sciences", year: 2019, desc: "Standard university textbook for fundamental physics principles." },

        // Mechanical Engineering
        { title: "Shigley's Mechanical Engineering Design", author: "Richard G. Budynas, Keith J. Nisbett", isbn: "9780073398204", category: "Mechanical Engineering", dept: "Mechanical Engineering", year: 2014, desc: "Standard text for mechanical design and machine element failure prevention." },
        { title: "Thermodynamics: An Engineering Approach", author: "Yunus A. Cengel, Michael A. Boles", isbn: "9780073398174", category: "Mechanical Engineering", dept: "Mechanical Engineering", year: 2018, desc: "Clear exposition of thermodynamic principles and applications." },
        { title: "Fluid Mechanics: Fundamentals and Applications", author: "Yunus A. Cengel, John M. Cimbala", isbn: "9781259696534", category: "Mechanical Engineering", dept: "Mechanical Engineering", year: 2017, desc: "Comprehensive fluid dynamics and flow mechanics text." },
        { title: "Fundamentals of Heat and Mass Transfer", author: "Theodore L. Bergman, Adrienne S. Lavine", isbn: "9780470501979", category: "Mechanical Engineering", dept: "Mechanical Engineering", year: 2011, desc: "Essential guide to conduction, convection, and radiation." },
        { title: "Engineering Mechanics: Statics & Dynamics", author: "Russell C. Hibbeler", isbn: "9780133915426", category: "Mechanical Engineering", dept: "Mechanical Engineering", year: 2015, desc: "Comprehensive problem-solving methodology for statics and particle dynamics." },

        // Electrical & Electronics Engineering
        { title: "Fundamentals of Electric Circuits", author: "Charles K. Alexander, Matthew N. O. Sadiku", isbn: "9780078028229", category: "Electrical Engineering", dept: "Electrical & Electronics Engineering", year: 2016, desc: "Standard introductory textbook on circuit analysis." },
        { title: "Microelectronic Circuits, 8th Edition", author: "Adel S. Sedra, Kenneth C. Smith", isbn: "9780190853464", category: "Electrical Engineering", dept: "Electrical & Electronics Engineering", year: 2019, desc: "The definitive guide to analog and digital microelectronic circuits." },
        { title: "Signals and Systems", author: "Alan V. Oppenheim, Alan S. Willsky", isbn: "9780138147570", category: "Electrical Engineering", dept: "Electrical & Electronics Engineering", year: 1996, desc: "Classic treatment of continuous-time and discrete-time signal analysis." },
        { title: "Control Systems Engineering", author: "Norman S. Nise", isbn: "9781118170519", category: "Electrical Engineering", dept: "Electrical & Electronics Engineering", year: 2015, desc: "Comprehensive guide to feedback control system analysis and synthesis." },

        // Civil Engineering
        { title: "Structural Analysis", author: "Russell C. Hibbeler", isbn: "9780134610672", category: "Civil Engineering", dept: "Civil Engineering", year: 2017, desc: "Methods of structural analysis for beams, trusses, and rigid frames." },
        { title: "Reinforced Concrete: Mechanics and Design", author: "James K. Wight", isbn: "9780133485967", category: "Civil Engineering", dept: "Civil Engineering", year: 2015, desc: "Theory and application of reinforced concrete structural element design." },
        { title: "Principles of Geotechnical Engineering", author: "Braja M. Das, Khaled Sobhan", isbn: "9781305635180", category: "Civil Engineering", dept: "Civil Engineering", year: 2017, desc: "Soil mechanics and foundation engineering fundamentals." },

        // Management Studies & Literature
        { title: "Principles of Management", author: "Stephen P. Robbins, Mary A. Coulter", isbn: "9780134527604", category: "Management Studies", dept: "Management Studies", year: 2017, desc: "Foundational principles of organizational management and leadership." },
        { title: "Financial Accounting", author: "Robert Libby, Patricia Libby", isbn: "9781259914898", category: "Management Studies", dept: "Management Studies", year: 2019, desc: "Focuses on financial statement analysis and corporate accounting." },
        { title: "To Kill a Mockingbird", author: "Harper Lee", isbn: "9780061120084", category: "Literature & Fiction", dept: "Applied Sciences", year: 1960, desc: "Pulitzer Prize-winning classic novel on justice and human dignity." },
        { title: "1984", author: "George Orwell", isbn: "9780451524935", category: "Literature & Fiction", dept: "Applied Sciences", year: 1949, desc: "Dystopian masterpiece exploring totalitarianism and surveillance." },
        { title: "The Great Gatsby", author: "F. Scott Fitzgerald", isbn: "9780743273565", category: "Literature & Fiction", dept: "Applied Sciences", year: 1925, desc: "Classic novel exploring theme of the American Dream in the 1920s." }
    ];

    // Helper map for Category & Department lookups
    const categoryMap = new Map(categories.map(c => [c.name, c.id]));
    const departmentMap = new Map(departments.map(d => [d.name, d.id]));

    // Generate ~100 books total by extending with generated variations if needed
    const allBooksToCreate = [...rawBooks];
    let extCount = 1;
    while (allBooksToCreate.length < 100) {
        const base = rawBooks[allBooksToCreate.length % rawBooks.length];
        const newIsbn = (BigInt(base.isbn) + BigInt(extCount * 100)).toString();
        allBooksToCreate.push({
            title: `${base.title} (Volume ${extCount + 1})`,
            author: base.author,
            isbn: newIsbn,
            category: base.category,
            dept: base.dept,
            year: base.year,
            desc: `${base.desc} Supplementary volume edition.`
        });
        extCount++;
    }

    let seededBooksCount = 0;
    for (let i = 0; i < allBooksToCreate.length; i++) {
        const b = allBooksToCreate[i];
        const categoryId = categoryMap.get(b.category) || categories[0].id;
        const departmentId = departmentMap.get(b.dept) || departments[0].id;
        const shelf = shelves[i % shelves.length];

        const createdBook = await prisma.book.create({
            data: {
                title: b.title,
                author: b.author,
                isbn: b.isbn,
                categoryId: categoryId,
                departmentId: departmentId,
                publishedYear: b.year,
                description: b.desc,
                availabilities: {
                    create: {
                        totalCopies: 5 + (i % 6),
                        availableCopies: 3 + (i % 4),
                        shelfId: shelf.id
                    }
                }
            }
        });
        seededBooksCount++;
    }

    console.log(`🎉 Successfully seeded ${seededBooksCount} real-world Books with stock & shelf availability!`);
    console.log("✨ Database seeding complete.");
}

main()
    .catch((e) => {
        console.error("❌ Seeding error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
