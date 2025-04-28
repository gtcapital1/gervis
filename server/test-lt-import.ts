import { eq, and, gt, lt } from 'drizzle-orm.js';

// This is just to test that the lt import is working
function testLtImport() {
  console.log('Testing lt import:');
  console.log('lt function exists:', typeof lt === 'function');
  
  // Print the function definition to verify it's imported correctly
  console.log('lt function:', lt.toString().slice(0, 100) + '...');
  
  console.log('Test completed successfully!');
}

testLtImport(); 