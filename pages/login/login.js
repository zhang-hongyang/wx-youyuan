// pages/login/login.js
const app = getApp();
const authService = require('../../services/authService.js');
const { STORAGE_KEYS } = require('../../utils/constants.js');
const { getRoleHomeRoute } = require('../../utils/rbac.js');

Page({
  data: {
    employeeId: '',
    bindCode: '',
    bindName: '',
    canSubmitBind: false,
    bindingRequired: false,
    pendingOpenId: '',
    showModal: false,
    modalTitle: '',
    modalContent: ''
  },

  onLoad() {
    // 检查是否已登录
    if (app.globalData.isLogin) {
      this.redirectAfterLogin(app.globalData.userInfo || {});
    }
  },

  onEmployeeIdInput(e) {
    this.setData({
      employeeId: e.detail.value
    });
    this.refreshSubmitState();
  },

  onBindCodeInput(e) {
    this.setData({
      bindCode: e.detail.value
    });
    this.refreshSubmitState();
  },

  onBindNameInput(e) {
    this.setData({
      bindName: e.detail.value
    });
    this.refreshSubmitState();
  },

  refreshSubmitState() {
    const { employeeId, bindCode } = this.data;
    this.setData({
      canSubmitBind: !!(employeeId && bindCode)
    });
  },

  async loginWithWechat() {
    wx.showLoading({ title: '登录中...' });

    try {
      const res = await authService.loginByWechat();
      wx.hideLoading();
      if (res.bound && res.userInfo) {
        this.handleLoginSuccess(res.userInfo, res.token);
        return;
      }

      this.setData({
        bindingRequired: true,
        pendingOpenId: res.pendingOpenId || ''
      });
      wx.showToast({
        title: '请先绑定员工档案',
        icon: 'none'
      });
    } catch (e) {
      wx.hideLoading();
      wx.showToast({
        title: e.message || '微信登录失败',
        icon: 'none'
      });
    }
  },

  async bindWechatAccount() {
    const { employeeId, bindCode, bindName, canSubmitBind } = this.data;

    if (!canSubmitBind) {
      wx.showToast({
        title: '请填写员工编号和绑定码',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '绑定中...' });

    try {
      const res = await authService.bindWechatAccount({
        employeeId,
        bindCode,
        name: bindName
      });
      wx.hideLoading();
      this.setData({
        bindingRequired: false,
        pendingOpenId: '',
        employeeId: '',
        bindCode: '',
        bindName: '',
        canSubmitBind: false
      });
      this.handleLoginSuccess(res.userInfo, res.token);
    } catch (e) {
      wx.hideLoading();
      wx.showToast({
        title: e.message || '绑定失败',
        icon: 'none'
      });
    }
  },

  resetBindingState() {
    this.setData({
      bindingRequired: false,
      pendingOpenId: '',
      employeeId: '',
      bindCode: '',
      bindName: '',
      canSubmitBind: false
    });
  },

  handleLoginSuccess(userInfo, token = '') {
    if (token) {
      wx.setStorageSync(STORAGE_KEYS.TOKEN, token);
    }
    app.login(userInfo);
    
    wx.showToast({
      title: '登录成功',
      icon: 'success'
    });
    
    setTimeout(() => {
      this.redirectAfterLogin(userInfo);
    }, 1000);
  },

  redirectAfterLogin(userInfo) {
    const route = getRoleHomeRoute(userInfo);
    if (route.isTab) {
      wx.switchTab({ url: route.url });
      return;
    }
    wx.redirectTo({ url: route.url });
  },

  // 显示用户协议
  showAgreement() {
    this.setData({
      showModal: true,
      modalTitle: '用户协议',
      modalContent: `欢迎使用送货人员工作台小程序！

一、服务条款
1. 本小程序为企业内部员工提供配送管理服务。
2. 用户需确保提供的个人信息真实有效。
3. 用户应妥善保管账号信息，不得转借他人使用。

二、隐私保护
1. 我们将严格保护用户的个人隐私信息。
2. 位置信息仅用于考勤打卡和配送管理。
3. 照片信息将添加水印，防止滥用。

三、使用规范
1. 用户应遵守公司相关规章制度。
2. 不得利用本系统从事违法违规活动。
3. 发现问题应及时上报，不得隐瞒。

四、责任声明
1. 用户应对自己的行为负责。
2. 因用户操作不当造成的损失，由用户承担。
3. 系统故障导致的损失，我们将积极协助解决。

感谢您的理解与支持！`
    });
  },

  // 显示隐私政策
  showPrivacy() {
    this.setData({
      showModal: true,
      modalTitle: '隐私政策',
      modalContent: `隐私政策

我们非常重视您的隐私保护，特此说明：

一、信息收集
1. 基本信息：姓名、手机号、工号等。
2. 位置信息：用于考勤打卡和配送管理。
3. 照片信息：打卡照片、货物照片等。
4. 工作数据：任务完成情况、绩效数据等。

二、信息使用
1. 用于身份验证和考勤管理。
2. 用于工作任务分配和跟踪。
3. 用于绩效统计和奖金计算。
4. 用于问题追溯和责任认定。

三、信息保护
1. 采用加密技术保护数据传输安全。
2. 严格限制数据访问权限。
3. 定期备份，防止数据丢失。
4. 遵守相关法律法规要求。

四、您的权利
1. 有权查看和更正个人信息。
2. 有权申请删除个人信息。
3. 有权对数据处理提出异议。

如有疑问，请联系人力资源部门。`
    });
  },

  // 关闭弹窗
  closeModal() {
    this.setData({
      showModal: false
    });
  }
});
