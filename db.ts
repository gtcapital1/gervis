// Create a postgres connection
const client = postgres(connectionString!, { 
  prepare: false,
  debug: false // Disabilitato il debug
}); 