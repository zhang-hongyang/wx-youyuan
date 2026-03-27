/**
 * 工具函数集合
 */

// 格式化时间
function formatTime(date, format = 'yyyy-MM-dd hh:mm') {
  if (typeof date === 'string') {
    date = new Date(date.replace(/-/g, '/'));
  } else if (typeof date === 'number') {
    date = new Date(date);
  }
  
  const o = {
    'M+': date.getMonth() + 1,
    'd+': date.getDate(),
    'h+': date.getHours(),
    'm+': date.getMinutes(),
    's+': date.getSeconds(),
    'q+': Math.floor((date.getMonth() + 3) / 3),
    'S': date.getMilliseconds()
  };
  
  if (/(y+)/.test(format)) {
    format = format.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length));
  }
  
  for (let k in o) {
    if (new RegExp('(' + k + ')').test(format)) {
      format = format.replace(RegExp.$1, RegExp.$1.length === 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length));
    }
  }
  
  return format;
}

// 格式化日期 yyyy-MM-dd
function formatDate(date) {
  if (typeof date === 'string') {
    date = new Date(date.replace(/-/g, '/'));
  } else if (typeof date === 'number') {
    date = new Date(date);
  }

  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 计算时间差
function timeDiff(startTime, endTime, unit = 'minutes') {
  const start = new Date(startTime.replace(/-/g, '/')).getTime();
  const end = new Date(endTime.replace(/-/g, '/')).getTime();
  const diff = end - start;
  
  switch(unit) {
    case 'seconds': return Math.floor(diff / 1000);
    case 'minutes': return Math.floor(diff / (1000 * 60));
    case 'hours': return Math.floor(diff / (1000 * 60 * 60));
    case 'days': return Math.floor(diff / (1000 * 60 * 60 * 24));
    default: return diff;
  }
}

// 格式化时长
function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes}分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
}

// 防抖函数
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// 节流函数
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// 生成唯一ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 验证手机号
function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone);
}

// 计算两点距离（米）
function calcDistance(lat1, lng1, lat2, lng2) {
  const rad = (d) => d * Math.PI / 180.0;
  const radLat1 = rad(lat1);
  const radLat2 = rad(lat2);
  const a = radLat1 - radLat2;
  const b = rad(lng1) - rad(lng2);
  let s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) + 
    Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)));
  s = s * 6378.137 * 1000;
  return Math.round(s);
}

// 检查是否在范围内
function isInRange(lat, lng, centerLat, centerLng, range = 200) {
  const distance = calcDistance(lat, lng, centerLat, centerLng);
  return distance <= range;
}

// 获取超时状态颜色
function getTimeoutColor(percentage) {
  if (percentage <= 1.1) return '#52c41a'; // 绿色
  if (percentage <= 1.3) return '#faad14'; // 黄色
  return '#f5222d'; // 红色
}

// 获取超时状态文字
function getTimeoutStatus(percentage) {
  if (percentage <= 1.1) return '正常';
  if (percentage <= 1.3) return '警告';
  return '超时';
}

// 格式化金额
function formatMoney(amount) {
  return '¥' + parseFloat(amount).toFixed(2);
}

// 绩效等级计算
function calcPerformanceLevel(score) {
  if (score >= 90) return { level: 'A', coefficient: 1.5, color: '#52c41a' };
  if (score >= 80) return { level: 'B', coefficient: 1.2, color: '#1890ff' };
  if (score >= 70) return { level: 'C', coefficient: 1.0, color: '#faad14' };
  return { level: 'D', coefficient: 0.8, color: '#f5222d' };
}

// 数据深拷贝
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// 数组去重
function uniqueArray(arr, key) {
  if (key) {
    const seen = new Set();
    return arr.filter(item => {
      const val = item[key];
      if (seen.has(val)) return false;
      seen.add(val);
      return true;
    });
  }
  return [...new Set(arr)];
}

// 分组
function groupBy(array, key) {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) result[group] = [];
    result[group].push(item);
    return result;
  }, {});
}

// 添加水印信息到照片
function addWatermarkToPhoto(photoUrl, info) {
  // 在实际项目中，这里应该使用 canvas 绘制水印
  // 返回带水印的图片地址
  return new Promise((resolve) => {
    const canvasId = 'watermark-canvas';
    const ctx = wx.createCanvasContext(canvasId);
    
    // 获取图片信息
    wx.getImageInfo({
      src: photoUrl,
      success: (res) => {
        const { width, height } = res;
        
        // 绘制原图
        ctx.drawImage(photoUrl, 0, 0, width, height);
        
        // 绘制水印背景
        ctx.setFillStyle('rgba(0, 0, 0, 0.5)');
        ctx.fillRect(10, height - 80, 300, 70);
        
        // 绘制水印文字
        ctx.setFillStyle('#ffffff');
        ctx.setFontSize(20);
        ctx.fillText(`时间: ${info.time}`, 20, height - 50);
        ctx.fillText(`地点: ${info.location}`, 20, height - 25);
        ctx.fillText(`人员: ${info.name}`, 20, height - 5);
        
        ctx.draw(false, () => {
          wx.canvasToTempFilePath({
            canvasId,
            success: (res) => resolve(res.tempFilePath)
          });
        });
      }
    });
  });
}

module.exports = {
  formatTime,
  formatDate,
  timeDiff,
  formatDuration,
  debounce,
  throttle,
  generateId,
  isValidPhone,
  calcDistance,
  isInRange,
  getTimeoutColor,
  getTimeoutStatus,
  formatMoney,
  calcPerformanceLevel,
  deepClone,
  uniqueArray,
  groupBy,
  addWatermarkToPhoto
};
