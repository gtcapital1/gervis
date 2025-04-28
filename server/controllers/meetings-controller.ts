import { db } from '../db.js';
import { meetings, Meeting, InsertMeeting } from '@shared/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for creating a new meeting
export const createMeetingSchema = z.object({
  clientId: z.number(),
  advisorId: z.number().optional(),
  subject: z.string().min(1),
  title: z.string().optional(),
  location: z.string().optional(),
  dateTime: z.string().transform(str => new Date(str)), // Handle dates sent as strings
  duration: z.number().min(1).optional(),
  notes: z.string().optional(),
});

// Validation schema for updating a meeting
export const updateMeetingSchema = createMeetingSchema.partial().extend({
  id: z.number(),
});

// Get all meetings for an advisor
export async function getMeetingsByAdvisor(advisorId: number): Promise<Meeting[]> {
  console.log(`[getMeetingsByAdvisor] Getting meetings for advisor ${advisorId}`);
  try {
    const result = await db.select().from(meetings).where(eq(meetings.advisorId, advisorId));
    console.log(`[getMeetingsByAdvisor] Found ${result.length} meetings`);
    return result;
  } catch (error) {
    console.error('[getMeetingsByAdvisor] Database error:', error);
    throw error;
  }
}

// Get all meetings for a client
export async function getMeetingsByClient(clientId: number): Promise<Meeting[]> {
  console.log(`[getMeetingsByClient] Getting meetings for client ${clientId}`);
  try {
    const result = await db.select().from(meetings).where(eq(meetings.clientId, clientId));
    console.log(`[getMeetingsByClient] Found ${result.length} meetings`);
    return result;
  } catch (error) {
    console.error('[getMeetingsByClient] Database error:', error);
    throw error;
  }
}

// Get a specific meeting by ID
export async function getMeetingById(id: number): Promise<Meeting | undefined> {
  console.log(`[getMeetingById] Getting meeting with ID ${id}`);
  try {
    const results = await db.select().from(meetings).where(eq(meetings.id, id));
    console.log('[getMeetingById] Result:', results[0] ? 'Found' : 'Not found');
    return results[0];
  } catch (error) {
    console.error('[getMeetingById] Database error:', error);
    throw error;
  }
}

// Get meetings within a time range
export async function getMeetingsByTimeRange(
  advisorId: number,
  startDate: Date,
  endDate: Date
): Promise<Meeting[]> {
  console.log(`[getMeetingsByTimeRange] Getting meetings for advisor ${advisorId} between ${startDate} and ${endDate}`);
  try {
    const result = await db
      .select()
      .from(meetings)
      .where(
        and(
          eq(meetings.advisorId, advisorId),
          gte(meetings.dateTime, startDate),
          lte(meetings.dateTime, endDate)
        )
      );
    console.log(`[getMeetingsByTimeRange] Found ${result.length} meetings`);
    return result;
  } catch (error) {
    console.error('[getMeetingsByTimeRange] Database error:', error);
    throw error;
  }
}

// Create a new meeting
export async function createMeeting(data: Omit<InsertMeeting, 'advisorId'> & { advisorId?: number }): Promise<Meeting> {
  console.log('[createMeeting] Creating new meeting with data:', data);
  
  // Ensure we have an advisorId
  if (!data.advisorId) {
    throw new Error('advisorId is required for creating a meeting');
  }
  
  try {
    // Insert the meeting
    const result = await db.insert(meetings).values(data as InsertMeeting).returning();
    
    console.log('[createMeeting] Insert result:', result);
    
    if (!result || result.length === 0) {
      console.error('[createMeeting] No result returned from database insert operation');
      throw new Error('Failed to create meeting: No result returned from database');
    }
    
    // Return the created meeting
    return result[0];
  } catch (error) {
    console.error('[createMeeting] Database error:', error);
    throw error;
  }
}

// Update an existing meeting
export async function updateMeeting(id: number, data: Partial<InsertMeeting>): Promise<Meeting | undefined> {
  console.log(`[updateMeeting] Updating meeting ${id} with data:`, data);
  try {
    // Update the meeting
    const result = await db
      .update(meetings)
      .set(data)
      .where(eq(meetings.id, id))
      .returning();
    
    console.log('[updateMeeting] Update result:', result);
    
    if (!result || result.length === 0) {
      console.error('[updateMeeting] No result returned from database update operation');
      throw new Error('Failed to update meeting: No result returned from database');
    }
    
    // Return the updated meeting
    return result[0];
  } catch (error) {
    console.error('[updateMeeting] Database error:', error);
    throw error;
  }
}

// Delete a meeting
export async function deleteMeeting(id: number): Promise<boolean> {
  console.log(`[deleteMeeting] Deleting meeting ${id}`);
  try {
    const result = await db
      .delete(meetings)
      .where(eq(meetings.id, id))
      .returning();
    
    console.log('[deleteMeeting] Delete result:', result);
    
    return result.length > 0;
  } catch (error) {
    console.error('[deleteMeeting] Database error:', error);
    throw error;
  }
} 