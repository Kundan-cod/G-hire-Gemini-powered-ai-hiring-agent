import { db, collection, getDocs, addDoc } from './firebase';
import freelancersData from '../../database/sample_freelancers.json';

export const seedFreelancers = async () => {
  try {
    const snap = await getDocs(collection(db, 'freelancers'));
    if (snap.empty) {
      console.log("Seeding freelancers...");
      for (const freelancer of freelancersData) {
        await addDoc(collection(db, 'freelancers'), freelancer);
      }
      console.log("Seeding complete!");
      return true;
    }
    return false;
  } catch (error) {
    console.error("Seeding error:", error);
    return false;
  }
};
