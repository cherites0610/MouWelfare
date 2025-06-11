import axios from 'axios';
import { createWriteStream } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function downloadFile(url: string): Promise<string> {
    const fileExt = url.split('.')!.pop()!.split('?')[0]; // 例如 pdf
    const filename = `${uuidv4()}.${fileExt}`;
    const filePath = join(tmpdir(), filename);

    const response = await axios.get(url, { responseType: 'stream' });

    const writer = createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
        writer.on('finish', () => resolve());
        writer.on('error', (err) => reject(err));
    });

    return filePath;
}
