import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function syncStock(applyFix = false) {
    console.log(`🔍 Inspecting inventory consistency (Apply Fix: ${applyFix})...`);

    const availabilities = await prisma.bookAvailability.findMany({
        include: {
            book: {
                include: {
                    issuedBooks: { where: { isReturned: false } },
                    reservations: { where: { status: { status: "Reserved" } } }
                }
            }
        }
    });

    let mismatchCount = 0;
    for (const item of availabilities) {
        const issued = item.book.issuedBooks ? item.book.issuedBooks.length : 0;
        const reserved = item.book.reservations ? item.book.reservations.length : 0;
        const expectedAvailable = Math.max(0, item.totalCopies - issued - reserved);

        if (item.availableCopies !== expectedAvailable) {
            mismatchCount++;
            if (mismatchCount <= 10) {
                console.log(
                    `Book #${item.bookId} [${item.book.title.slice(0, 35)}]: Total=${item.totalCopies}, CurrentAvail=${item.availableCopies}, Issued=${issued}, Reserved=${reserved} => ExpectedAvail=${expectedAvailable}`
                );
            }

            if (applyFix) {
                await prisma.bookAvailability.update({
                    where: { id: item.id },
                    data: { availableCopies: expectedAvailable }
                });
            }
        }
    }

    console.log(`\n📊 Summary: Found ${mismatchCount} books with inconsistent availability out of ${availabilities.length} total.`);
    if (applyFix && mismatchCount > 0) {
        console.log(`✅ Successfully updated ${mismatchCount} book availability records to match totalCopies - issued - reserved.`);
    }
}

const apply = process.argv.includes("--fix");
syncStock(apply)
    .catch(console.error)
    .finally(() => prisma.$disconnect());
