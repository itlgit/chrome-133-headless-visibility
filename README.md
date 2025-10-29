# Purpose
we have several webdriverjs page tests that have started to fail after the upgrade to chrome 133, running in headless mode on mac. these tests were running fine prior to the upgrade, and continue to run fine if run headed. it's only in headless mode that they fail. they also don't fail when run in individually, but it seems like a combination of pages that use context menu (right) clicks, followed by pages that require content to be scrolled into view.

## Running tests

1. npm install
1. npm test

the test repeatedly opens 3 pages, the first of them containing a test that performs a context-click, and the remainder containing elements that are required to be scrolled into view before they can be interacted with. the `document.visibilitystate` property is logged after page loading and before and after each test.

if you run `npm run test-headless`, you'll see that the property is set to hidden after the first couple of iterations through.

while this isn't the direct cause of the failures, it is a symptom of something else that's not quite working in headless. in the last test **test progressive loading**, we're noticing that the list view component isn't scrolling its content to reveal the correct item. (the components behavior is set to automatically scroll the element into view).

_upon test failure, a screenshot is captured to show the state of the page_