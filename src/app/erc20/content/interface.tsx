// Generated from the ERC-20 Code Trail research document.
// Source: erc20-archaeology/site/index.html. Edit the generator, not this file.
import { cx } from "../cx";
import { Addr } from "../components/Addr";
import { CodeBlock } from "../components/CodeBlock";
import { TableScroll } from "../components/TableScroll";

export function Interface() {
  return (
    <>
      <p className={cx("eyebrow")}>
        The interface
      </p>
      <h2>
        The final six, plus two events
      </h2>
      <div className={cx("split split--code")}>
        <div>
          <CodeBlock lang="sol" code={"function totalSupply() constant returns (uint256 supply)\nfunction balanceOf(address _owner) constant returns (uint256 balance)\nfunction transfer(address _to, uint256 _value) returns (bool success)\nfunction transferFrom(address _from, address _to, uint256 _value) returns (bool success)\nfunction approve(address _spender, uint256 _value) returns (bool success)\nfunction allowance(address _owner, address _spender) constant returns (uint256 remaining)\n\nevent Transfer(address indexed _from, address indexed _to, uint256 _value)\nevent Approval(address indexed _owner, address indexed _spender, uint256 _value)"} />
        </div>
        <div className={cx("prose iface-notes")}>
          <div>
            <p>
              This is the interface as issue #20 finally stated it. Reading the trail requires holding two things apart: the
              {" "}
              <em>name</em>
              {" "}
              of a member and its
              {" "}
              <em>signature</em>
              . Several members reached their final name months before they reached their final parameter list, and one,
              {" "}
              <code>transferFrom</code>
              , was born as a typo and corrected twenty-four seconds later.
            </p>
            <p>
              Three further members appear in almost every real token and in none of the required set:
              {" "}
              <code>name</code>
              ,
              {" "}
              <code>symbol</code>
              {" "}
              and
              {" "}
              <code>decimals</code>
              . They were proposed as wallet rendering hints, marked optional at birth, and are still optional today.
            </p>
          </div>
          <div className={cx("iface-legend")}>
            <h4 className={cx("eyebrow")}>Marks used in every table below</h4>
            <dl className={cx("deflist")}>
              <div>
                <dt>
                  <span className={cx("m-y")}>✔</span>
                  {" "}
                  present
                </dt>
                <dd>Present under its final name and with its final parameter signature.</dd>
              </div>
              <div>
                <dt>
                  <span className={cx("m-p")}>~</span>
                  {" "}
                  partial
                </dt>
                <dd>Name present, parameter signature differs from the final one.</dd>
              </div>
              <div>
                <dt>
                  <span className={cx("m-n")}>–</span>
                  {" "}
                  absent
                </dt>
                <dd>Not present.</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </>
  );
}
