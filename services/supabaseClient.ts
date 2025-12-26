import { createClient } from '@supabase/supabase-js';

// Thông tin kết nối dự án SQL Editor của bạn
const supabaseUrl = 'https://rskygaoiaxyumqvjnmne.supabase.co';
const supabaseKey = 'sb_publishable_xMW_56SiKiUR0l_AYyuhXA_VkIKQo3d';

export const supabase = createClient(supabaseUrl, supabaseKey);