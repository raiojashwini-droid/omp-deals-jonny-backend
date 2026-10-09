const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const allCars = await prisma.vehicle.findMany();
    let blobCars = [];
    allCars.forEach(c => {
       let imgs = c.images;
       if (typeof imgs === 'string' && imgs.includes('blob:')) blobCars.push(c.id);
       if (Array.isArray(imgs)) {
          if (imgs.some(i => typeof i === 'string' && i.includes('blob:'))) blobCars.push(c.id);
       }
    });
    console.log('Total vehicles with blob images in DB:', blobCars.length);
    console.log('Vehicle IDs:', blobCars);
    
    // Now replace blob images with a placeholder
    for (let id of blobCars) {
        const car = allCars.find(c => c.id === id);
        let newImgs = [];
        if (Array.isArray(car.images)) {
             newImgs = car.images.map(i => (typeof i === 'string' && i.includes('blob:')) ? 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' : i);
        } else if (typeof car.images === 'string' && car.images.includes('blob:')) {
             newImgs = ['https://images.unsplash.com/photo-1552519507-da3b142c6e3d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'];
        } else {
             newImgs = car.images;
        }
        
        await prisma.vehicle.update({
            where: { id },
            data: { images: newImgs }
        });
        console.log(`Updated vehicle ${id}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
check();
