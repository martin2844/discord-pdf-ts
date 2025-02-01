import axios from "axios";
import { MATE_UPLOAD_URL, MATE_UPLOAD_KEY } from "@config";

/**
 * Uploads a base64 image to the CodigoMate cloud service
 * @param base64Image - The base64 string of the image to upload
 * @returns Promise<string> - The URL of the uploaded image
 */
export async function uploadBase64Image(base64Image: string): Promise<string> {
    try {
        // Check if the base64 string already has a valid PNG prefix
        if (base64Image.startsWith('iVBORw0KGgoAAAANSUhEUg')) {
            // Add the proper prefix if it's missing
            base64Image = `data:image/png;base64,${base64Image}`;
        }

        // Now clean any existing prefix to ensure consistent format
        const base64Data = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

        const formData = new URLSearchParams();
        formData.append('base64', `data:image/png;base64,${base64Data}`);
        formData.append('uploadcode', MATE_UPLOAD_KEY);

        const response = await axios.post(
            `${MATE_UPLOAD_URL}/base64.php`,
            formData,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        if (response.data && response.data.url) {
            return response.data.url;
        } else {
            throw new Error('Upload failed - No URL in response');
        }
    } catch (error) {
        console.error('Error uploading to CodigoMate:', error);
        throw error;
    }
}
