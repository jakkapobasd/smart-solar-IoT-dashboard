import fs from 'fs';
async function run() {
  const res = await fetch('https://smartsolar-th.com/swagger/v1/swagger.json');
  const data = await res.json();
  
  // paths having 'brightness'
  console.log("Paths with 'brightness':");
  for (const path in data.paths) {
    if (path.toLowerCase().includes('brightness')) {
      console.log(path);
      for (const method in data.paths[path]) {
        console.log("  ", method);
        const params = data.paths[path][method].parameters;
        if (params) {
          console.log("    params:", params.map((p: any) => p.name).join(", "));
        }
      }
    }
    if (path.toLowerCase().includes('energy-summary')) {
       console.log(path);
       for (const method in data.paths[path]) {
        console.log("  ", method);
        const params = data.paths[path][method].parameters;
        if (params) {
          console.log("    params:", params.map((p: any) => p.name).join(", "));
        }
      }
    }
  }
}
run();
