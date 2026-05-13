import { google } from 'googleapis';

const client_id = process.env.GOOGLE_CLIENT_ID;
const client_secret = process.env.GOOGLE_CLIENT_SECRET;
const redirect_uri = process.env.GOOGLE_REDIRECT_URI;

const auth = new google.auth.OAuth2(client_id, client_secret, redirect_uri);

if (process.env.GOOGLE_REFRESH_TOKEN) {
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
}

export const getAuthUrl = () => {
  return auth.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.readonly'
    ],
    prompt: 'consent',
  });
};

export const getTokens = async (code: string) => {
  const { tokens } = await auth.getToken(code);
  return tokens;
};

export const uploadFileToDrive = async (fileBuffer: Buffer, fileName: string, mimeType: string, folderId: string) => {
  try {
    const drive = google.drive({ version: 'v3', auth });
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };
    const media = {
      mimeType: mimeType,
      body: require('stream').Readable.from(fileBuffer),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    // Make file public so it can be viewed in the app
    await drive.permissions.create({
      fileId: response.data.id!,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('Error uploading to drive:', error.message);
    throw error;
  }
};

export const getSheetsData = async (sheetId: string, range: string) => {
  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: range,
    });
    return response.data.values;
  } catch (error: any) {
    console.error('Error fetching sheets data:', error.message);
    throw error;
  }
};

export const appendSheetsData = async (sheetId: string, range: string, values: any[][]) => {
  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: values,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error appending sheets data:', error.message);
    throw error;
  }
};

export const updateSheetRow = async (sheetId: string, range: string, values: any[][]) => {
  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: values,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error updating sheets data:', error.message);
    throw error;
  }
};

export const deleteSheetRow = async (sheetId: string, sheetName: string, rowIndex: number) => {
  try {
    const sheets = google.sheets({ version: 'v4', auth });
    
    // First, we need to get the sheet ID (numeric) for the batchUpdate
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName);
    const numericSheetId = sheet?.properties?.sheetId;

    if (numericSheetId === undefined) throw new Error('Sheet not found');

    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: numericSheetId,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              },
            },
          },
        ],
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error deleting sheets row:', error.message);
    throw error;
  }
};
