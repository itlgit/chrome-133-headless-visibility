const { Builder, By, until } = require('selenium-webdriver');
const { Options } = require('selenium-webdriver/chrome');
const fs = require('node:fs');
const path = require('node:path');

const getPage = (pageName) =>
  `https://www.oracle.com/webfolder/technetwork/jet/content/listView-${pageName}/demo.html?theme=redwood&cssVars=default&debug=min&dir=ltr&fontSize=fontnone&color=default&notagcss=true&scale=lg&density=standard`;

describe('Listview test', function () {
  const testTimeout = 60 * 1000;
  const waitTimeout = testTimeout / 4;
  this.timeout(testTimeout);
  const headless = process.argv.includes('--headless');

  let driver;

  before(async () => {
    const builder = new Builder();
    if (headless) {
      builder.setChromeOptions(new Options().addArguments('--headless'));
    }
    driver = await builder.forBrowser('chrome').build();
    await driver.manage().window().setRect({ width: 1280, height: 1024 });
    
    // remove old screenshots
    const files = fs.readdirSync(__dirname);
    for (const file of files) {
      if (file.match(/^_.*\.png$/)) {
        fs.unlinkSync(path.join(__dirname, file));
      }
    }
 });
  after(async () => await driver.quit());
  beforeEach(async () => await logHiddenDoc(driver, '[start]'));
  afterEach(async function () {
    await logHiddenDoc(driver, '[end]');
    // capture screenshot if test failed
    if (this.currentTest.state === 'failed') {
      const screenshot = await driver.takeScreenshot();
      const screenshotPath = path.join(
        __dirname,
        `./${this.currentTest.title.replace(/[^a-z0-9]/gi, '_')}.png`
      );
      fs.writeFileSync(screenshotPath, screenshot, 'base64');
      console.log(`screenshot saved to: ${screenshotPath}`);
    }
  });

  for (let i = 1; i <= 5; i++) {
    it(`#${i}: test context menu`, async () => {
      await loadPage(driver, 'customContextMenuListView');

      const menu = await driver.wait(until.elementLocated(By.css('oj-menu')));
      const avatar = await driver.wait(
        until.elementLocated(By.css('oj-avatar'))
      );
      // open context menu
      await driver.executeScript(
        (menu, launcher) => menu.open(new CustomEvent('click'), { launcher }),
        menu,
        avatar
      );
      const item = await driver.findElement(
        By.xpath("//*[@role='menuitem' and contains(text(), 'Action 1')]")
      );
      // wait for element to stop animating by sampling its location
      await driver.wait(async (driver) => {
        const location = await item.getRect();
        await driver.sleep(100);
        const newLocation = await item.getRect();
        return location.x === newLocation.x && location.y === newLocation.y;
      });
      await driver.wait(until.elementIsVisible(item));
      // click Action 1
      await driver.actions().move({ origin: item });
      await item.click();
      // expect Action 1 to be clicked
      await driver.wait(
        async (driver) =>
          (await driver.findElement(By.id('selected')).getText()) === 'Action 1'
      );
    });

    it(`#${i}: test hierarchical progressive loading`, async () =>
      loadPage(driver, 'progressiveLoadHierListView'));

    it(`#${i}: test progressive loading`, async () => {
      const listView = await loadPage(driver, 'progressiveLoadListView');
      const linkText = 'http://t.co/2kEScMElEH';
      await setProperty(listView, 'scrollToKey', 'always');
      await setProperty(listView, 'scrollPosition', {
        key: linkText,
      });
      // wait for link to be scrolled into view
      const link = await driver.wait(
        until.elementLocated(By.xpath(`//a[text()='${linkText}']`)),
        waitTimeout,
        `waiting for ${linkText} to scroll into view`
      );
      await driver.wait(
        until.elementIsVisible(link),
        waitTimeout,
        `waiting for ${linkText} to be visible`
      );
    });
  }

  async function loadPage(driver, pageName) {
    await driver.get(getPage(pageName));
    await logHiddenDoc(driver, '[loaded]');

    const listView = await driver.wait(
      until.elementLocated(By.css('oj-list-view.oj-complete')),
      waitTimeout,
      'waiting for oj-list-view to render'
    );
    // wait for list to finish loading
    await driver.wait(
      async () =>
        (await listView.findElements(By.css('.oj-listview-skeleton'))).length <=
        3,
      waitTimeout,
      'waiting for oj-list-view to fetch'
    );
    return listView;
  }

  async function logHiddenDoc(driver, marker) {
    const visibility = await driver.executeScript(
      () => document.visibilityState
    );
    if (visibility === 'hidden') {
      console.debug(`${marker} document.visibilityState: hidden`);
    }
  }

  async function setProperty(el, name, value) {
    await el
      .getDriver()
      .executeScript((el, name, value) => (el[name] = value), el, name, value);
  }
});
