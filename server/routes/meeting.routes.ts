import { Router, Request, Response } from 'express';
import { isAuthenticated } from '../routes';
import { z } from 'zod';
import {
  getMeetingsByAdvisor,
  getMeetingsByClient,
  getMeetingById,
  getMeetingsByTimeRange,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  createMeetingSchema,
  updateMeetingSchema
} from '../controllers/meetings-controller';
import { sendMeetingInviteEmail, sendMeetingUpdateEmail } from '../email';
import { db } from '../db';
import { clients, users, meetings } from '@shared/schema';
import { eq } from 'drizzle-orm';
import * as ical from 'ical-generator';
import { ICalAttendeeRole } from 'ical-generator';

const router = Router();

// Helper function to format date and time
function formatDate(date: Date): string {
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Helper function to generate iCal data
function generateICalData(meeting: any, advisor: any, client: any): string {
  const calendar = ical.default({
    name: 'Gervis Meetings',
    prodId: '//Gervis//MeetingCalendar//IT',
  });
  
  const endTime = new Date(meeting.dateTime);
  endTime.setMinutes(endTime.getMinutes() + (meeting.duration || 60));
  
  calendar.createEvent({
    start: new Date(meeting.dateTime),
    end: endTime,
    summary: meeting.subject,
    description: meeting.notes || '',
    location: meeting.location || 'Online',
    organizer: {
      name: `${advisor.firstName} ${advisor.lastName}`,
      email: advisor.email,
    },
    attendees: [
      {
        name: `${client.firstName} ${client.lastName}`,
        email: client.email,
        role: ICalAttendeeRole.REQ
      }
    ]
  });
  
  return calendar.toString();
}

// Get all meetings for the authenticated advisor
router.get('/meetings', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const advisorId = req.user?.id;
    if (!advisorId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    const meetings = await getMeetingsByAdvisor(advisorId);
    
    // Ensure dates are formatted correctly as ISO strings
    const formattedMeetings = meetings.map(meeting => ({
      ...meeting,
      dateTime: meeting.dateTime instanceof Date ? meeting.dateTime.toISOString() : meeting.dateTime,
      createdAt: meeting.createdAt instanceof Date ? meeting.createdAt.toISOString() : meeting.createdAt
    }));
    
    console.log("Returning meetings:", formattedMeetings);
    
    return res.json({ success: true, meetings: formattedMeetings });
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch meetings' });
  }
});

// Get meetings by date range
router.get('/meetings/range', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Validate query parameters
    const querySchema = z.object({
      start: z.string(),
      end: z.string()
    });
    
    const validation = querySchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid date range parameters',
        errors: validation.error.format() 
      });
    }
    
    const advisorId = req.user?.id;
    if (!advisorId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    const { start, end } = validation.data;
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    const meetings = await getMeetingsByTimeRange(advisorId, startDate, endDate);
    return res.json({ success: true, meetings });
  } catch (error) {
    console.error('Error fetching meetings by range:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch meetings' });
  }
});

// Get meetings for a specific client
router.get('/clients/:clientId/meetings', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId)) {
      return res.status(400).json({ success: false, message: 'Invalid client ID' });
    }
    
    const meetings = await getMeetingsByClient(clientId);
    return res.json({ success: true, meetings });
  } catch (error) {
    console.error('Error fetching client meetings:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch client meetings' });
  }
});

// Get a specific meeting by ID
router.get('/meetings/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const meetingId = parseInt(req.params.id);
    if (isNaN(meetingId)) {
      return res.status(400).json({ success: false, message: 'Invalid meeting ID' });
    }
    
    const meeting = await getMeetingById(meetingId);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }
    
    return res.json({ success: true, meeting });
  } catch (error) {
    console.error('Error fetching meeting by ID:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch meeting' });
  }
});

// Create a new meeting
router.post('/meetings', isAuthenticated, async (req: Request, res: Response) => {
  try {
    console.log('[POST /meetings] Received request body:', req.body);
    
    // Validate the request body
    const validation = createMeetingSchema.safeParse(req.body);
    if (!validation.success) {
      console.error('[POST /meetings] Validation error:', validation.error.format());
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid meeting data',
        errors: validation.error.format() 
      });
    }
    
    console.log('[POST /meetings] Validation successful. Validated data:', validation.data);
    
    // Set the advisorId to the authenticated user if not provided
    if (!validation.data.advisorId && req.user?.id) {
      console.log('[POST /meetings] Setting advisorId to current user:', req.user.id);
      validation.data.advisorId = req.user.id;
    }
    
    // Ensure the advisor ID matches the authenticated user
    if (validation.data.advisorId !== req.user?.id) {
      console.log('[POST /meetings] User ID mismatch. Body advisorId:', validation.data.advisorId, 'User ID:', req.user?.id);
      return res.status(403).json({ 
        success: false, 
        message: 'You can only create meetings for yourself as an advisor' 
      });
    }
    
    // Create the meeting
    console.log('[POST /meetings] Creating meeting with data:', validation.data);
    const meeting = await createMeeting({
      ...validation.data,
      // Ensure dateTime is a Date object
      dateTime: new Date(validation.data.dateTime)
    });
    
    console.log('[POST /meetings] Meeting created successfully:', meeting);
    
    // Send email notification if sendEmail flag is set
    const sendEmail = req.body.sendEmail === true;
    if (sendEmail) {
      try {
        // Get client and advisor information for the email
        const client = await db.query.clients.findFirst({
          where: meeting.clientId ? eq(clients.id, meeting.clientId) : undefined
        });
        
        const advisor = await db.query.users.findFirst({
          where: meeting.advisorId ? eq(users.id, meeting.advisorId) : undefined
        });
        
        if (client && advisor) {
          // Generate iCal data
          const icalData = generateICalData(meeting, advisor, client);
          
          // Format date and time
          const formattedDate = formatDate(new Date(meeting.dateTime));
          const formattedTime = formatTime(new Date(meeting.dateTime));
          
          // Create signature data if available
          const signatureData = advisor ? {
            firstName: advisor.firstName || undefined,
            lastName: advisor.lastName || undefined,
            company: advisor.company || undefined,
            email: advisor.email,
            phone: advisor.phone || undefined,
            role: advisor.role || undefined
          } : undefined;
          
          // Send the email
          await sendMeetingInviteEmail(
            client.email,
            `${client.firstName} ${client.lastName}`,
            advisor.firstName || '',
            advisor.lastName || '',
            meeting.subject,
            formattedDate,
            formattedTime,
            meeting.location || 'Online',
            meeting.notes || '',
            icalData,
            advisor.email,
            client.id,
            advisor.id,
            true,
            signatureData
          );
        }
      } catch (emailError) {
        console.error('Failed to send meeting invitation email:', emailError);
        // Continue with success response even if email fails
      }
    }
    
    return res.status(201).json({ success: true, meeting });
  } catch (error) {
    console.error('[POST /meetings] Error creating meeting:', error);
    return res.status(500).json({ success: false, message: 'Failed to create meeting', error: String(error) });
  }
});

// Update an existing meeting
router.put('/meetings/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const meetingId = parseInt(req.params.id);
    if (isNaN(meetingId)) {
      return res.status(400).json({ success: false, message: 'Invalid meeting ID' });
    }
    
    // Get the existing meeting
    const existingMeeting = await getMeetingById(meetingId);
    if (!existingMeeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }
    
    // Ensure the advisor owns this meeting
    if (existingMeeting.advisorId !== req.user?.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only update your own meetings' 
      });
    }
    
    // Validate the request body
    const validation = updateMeetingSchema.safeParse({
      ...req.body,
      id: meetingId
    });
    
    if (!validation.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid meeting data',
        errors: validation.error.format() 
      });
    }
    
    // Extract only the fields we want to update
    const { id, ...updateData } = validation.data;
    
    // If dateTime is included and is a string, convert it to a Date
    if (updateData.dateTime && typeof updateData.dateTime === 'string') {
      updateData.dateTime = new Date(updateData.dateTime);
    }
    
    // Update the meeting
    const updatedMeeting = await updateMeeting(meetingId, updateData);
    
    // Send email notification if sendEmail flag is set
    const sendEmail = req.body.sendEmail === true;
    if (sendEmail && updatedMeeting) {
      try {
        // Get client and advisor information for the email
        const client = await db.query.clients.findFirst({
          where: updatedMeeting.clientId ? eq(clients.id, updatedMeeting.clientId) : undefined
        });
        
        const advisor = await db.query.users.findFirst({
          where: updatedMeeting.advisorId ? eq(users.id, updatedMeeting.advisorId) : undefined
        });
        
        if (client && advisor && existingMeeting) {
          // Generate iCal data
          const icalData = generateICalData(updatedMeeting, advisor, client);
          
          // Format date and time for both old and new meeting
          const oldFormattedDate = formatDate(new Date(existingMeeting.dateTime));
          const oldFormattedTime = formatTime(new Date(existingMeeting.dateTime));
          const newFormattedDate = formatDate(new Date(updatedMeeting.dateTime));
          const newFormattedTime = formatTime(new Date(updatedMeeting.dateTime));
          
          // Create signature data if available
          const signatureData = advisor ? {
            firstName: advisor.firstName || undefined,
            lastName: advisor.lastName || undefined,
            company: advisor.company || undefined,
            email: advisor.email,
            phone: advisor.phone || undefined,
            role: advisor.role || undefined
          } : undefined;
          
          // Send the email
          await sendMeetingUpdateEmail(
            client.email,
            `${client.firstName} ${client.lastName}`,
            advisor.firstName || '',
            advisor.lastName || '',
            updatedMeeting.subject,
            oldFormattedDate,
            oldFormattedTime,
            newFormattedDate,
            newFormattedTime,
            updatedMeeting.location || 'Online',
            updatedMeeting.notes || '',
            icalData,
            advisor.email,
            client.id,
            advisor.id,
            true,
            signatureData
          );
        }
      } catch (emailError) {
        console.error('Failed to send meeting update email:', emailError);
        // Continue with success response even if email fails
      }
    }
    
    return res.json({ success: true, meeting: updatedMeeting });
  } catch (error) {
    console.error('Error updating meeting:', error);
    return res.status(500).json({ success: false, message: 'Failed to update meeting' });
  }
});

// Delete a meeting
router.delete('/meetings/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const meetingId = parseInt(req.params.id);
    if (isNaN(meetingId)) {
      return res.status(400).json({ success: false, message: 'Invalid meeting ID' });
    }
    
    // Get the existing meeting
    const existingMeeting = await getMeetingById(meetingId);
    if (!existingMeeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }
    
    // Ensure the advisor owns this meeting
    if (existingMeeting.advisorId !== req.user?.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only delete your own meetings' 
      });
    }
    
    // Delete the meeting
    const success = await deleteMeeting(meetingId);
    
    return res.json({ success });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete meeting' });
  }
});

// Debug route to get all meetings (admin only)
router.get('/meetings/debug', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    
    // Direct database query to get all meetings
    const result = await db.select().from(meetings);
    
    console.log("DEBUG - All meetings in database:", result);
    
    return res.json({ 
      success: true, 
      count: result.length,
      meetings: result.map(meeting => ({
        ...meeting,
        dateTime: meeting.dateTime instanceof Date ? meeting.dateTime.toISOString() : meeting.dateTime,
        createdAt: meeting.createdAt instanceof Date ? meeting.createdAt.toISOString() : meeting.createdAt
      }))
    });
  } catch (error) {
    console.error('Error in debug route:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch meetings for debug' });
  }
});

export function registerMeetingRoutes(app: Router) {
  app.use('/api', router);
} 